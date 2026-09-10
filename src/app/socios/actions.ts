"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { createSecureToken, tokenHash } from "@/lib/account-security";
import { db } from "@/lib/db";
import { sendAccountInvitation } from "@/lib/email";
import { createNumericCode } from "@/lib/identity";
import { hasPermission, requirePermission, requireUser, roleCodes } from "@/lib/access-control";

const memberSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PASSPORT", "RUC"], { message: "Selecciona un tipo de documento" }),
  documentNumber: z.string().trim().min(6, "Ingresa al menos 6 caracteres").max(20, "Máximo 20 caracteres").regex(/^[A-Za-z0-9-]+$/, "Usa solo letras, números y guiones"),
  firstName: z.string().trim().min(2, "Ingresa los nombres").max(100, "Máximo 100 caracteres"),
  lastName: z.string().trim().min(2, "Ingresa los apellidos").max(100, "Máximo 100 caracteres"),
  countryCode: z.enum(["PE", "CO", "EC", "CL", "US"], { message: "Selecciona un país" }),
  phone: z.string().trim().max(30, "Máximo 30 caracteres").regex(/^[+0-9() -]*$/, "Número de teléfono inválido"),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido").max(255, "Máximo 255 caracteres"),
  residence: z.string().trim().max(180, "Máximo 180 caracteres"),
  occupation: z.string().trim().max(140, "Máximo 140 caracteres"),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "COHABITING", "DIVORCED", "WIDOWED", "OTHER"]).optional(),
});

const registrationSchema = memberSchema.extend({
  profileType: z.enum(["INVESTOR", "AMBASSADOR", "BOTH"]),
  sponsorId: z.string().regex(/^[0-9a-f-]{36}$/i).or(z.literal("")),
});

export type CreateMemberState = {
  success: boolean;
  message: string;
  memberCode?: string;
  invitationSent?: boolean;
  errors?: Partial<Record<keyof z.infer<typeof registrationSchema>, string[]>>;
};

export async function createMemberAction(_previousState: CreateMemberState, formData: FormData): Promise<CreateMemberState> {
  const actor = await requireUser();
  const parsed = registrationSchema.safeParse({
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email"),
    residence: formData.get("residence") ?? "",
    occupation: formData.get("occupation") ?? "",
    maritalStatus: formData.get("maritalStatus") || undefined,
    profileType: formData.get("profileType"),
    sponsorId: formData.get("sponsorId") ?? "",
  });

  if (!parsed.success) {
    return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  }

  const actorRoles = roleCodes(actor);
  const canManageAll = hasPermission(actor, "MEMBERS");
  if (!canManageAll && !actorRoles.includes("AMBASSADOR")) return { success: false, message: "No tienes permiso para registrar personas." };
  const ownAmbassadorId = actor.member?.ambassadorProfile?.id;
  if (!canManageAll && !ownAmbassadorId) return { success: false, message: "Tu perfil de embajador no está activo." };
  const data = { ...parsed.data, profileType: canManageAll ? parsed.data.profileType : "INVESTOR" as const, sponsorId: canManageAll ? parsed.data.sponsorId : ownAmbassadorId! };
  const documentNumber = data.documentNumber.toUpperCase();

  const duplicate = await db.member.findUnique({
    where: { documentType_documentNumber: { documentType: data.documentType, documentNumber } },
    select: { id: true },
  });

  if (duplicate) {
    return { success: false, message: "Ya existe un socio con ese tipo y número de documento." };
  }

  const memberCode = createNumericCode();
  const invitationToken = createSecureToken();
  let createdMemberId = "";
  try {
    await db.$transaction(async (transaction) => {
      if (data.sponsorId) {
        const sponsor = await transaction.ambassadorProfile.findFirst({ where: { id: data.sponsorId, status: "ACTIVE" }, select: { id: true } });
        if (!sponsor) throw new Error("INVALID_SPONSOR");
      }
      const user = await transaction.user.create({ data: { email: data.email, displayName: `${data.firstName} ${data.lastName}`, status: "INVITED" } });
      const member = await transaction.member.create({
        data: {
          memberCode,
          userId: user.id,
          documentType: data.documentType,
          documentNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          countryCode: data.countryCode,
          phone: data.phone || null,
          email: data.email,
          residence: data.residence || null,
          occupation: data.occupation || null,
          maritalStatus: data.maritalStatus ?? null,
          status: "PROSPECT",
        },
        select: { id: true },
      });
      createdMemberId = member.id;

      if (data.profileType === "INVESTOR" || data.profileType === "BOTH") await transaction.investorProfile.create({ data: { memberId: member.id, sponsorId: data.sponsorId || null, status: "PROSPECT" } });
      if (data.profileType === "AMBASSADOR" || data.profileType === "BOTH") await transaction.ambassadorProfile.create({ data: { memberId: member.id, referralCode: memberCode, sponsorId: data.sponsorId || null, status: "ACTIVE" } });
      const roleCodes = [data.profileType !== "AMBASSADOR" ? "MEMBER" : null, data.profileType !== "INVESTOR" ? "AMBASSADOR" : null].filter((value): value is string => Boolean(value));
      const roles = await transaction.role.findMany({ where: { code: { in: roleCodes } }, select: { id: true } });
      if (roles.length) await transaction.userRole.createMany({ data: roles.map((role) => ({ userId: user.id, roleId: role.id })) });
      await transaction.accountInvitation.create({ data: { userId: user.id, tokenHash: tokenHash(invitationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });

      await transaction.auditLog.create({
        data: {
          action: "MEMBER_CREATED",
          actorUserId: actor.id,
          entityType: "Member",
          entityId: member.id,
          after: {
            documentType: data.documentType,
            documentNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            countryCode: data.countryCode,
            email: data.email,
            memberCode,
            profileType: data.profileType,
            status: "PROSPECT",
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SPONSOR") return { success: false, message: "El embajador patrocinador no está disponible." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "El documento, correo o código generado ya está registrado. Inténtalo nuevamente." };
    }
    return { success: false, message: "No fue posible guardar el socio. Inténtalo nuevamente." };
  }

  const delivery = await sendAccountInvitation({ email: data.email, name: data.firstName, token: invitationToken });
  if (!delivery.sent) await db.auditLog.create({ data: { action: "INVITATION_DELIVERY_FAILED", entityType: "Member", entityId: createdMemberId, after: { reason: delivery.reason } } });
  revalidatePath("/socios");
  return { success: true, memberCode, invitationSent: delivery.sent, message: delivery.sent ? "Persona creada e invitación enviada." : "Persona creada. Configura el servicio de correo para enviar la invitación." };
}

export async function updateMemberAction(memberId: string, _previousState: CreateMemberState, formData: FormData): Promise<CreateMemberState> {
  const actor = await requirePermission("MEMBERS");
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { success: false, message: "Socio inválido." };
  const parsed = registrationSchema.safeParse({
    documentType: formData.get("documentType"), documentNumber: formData.get("documentNumber"),
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    countryCode: formData.get("countryCode"), phone: formData.get("phone") ?? "", email: formData.get("email"),
    residence: formData.get("residence") ?? "", occupation: formData.get("occupation") ?? "", maritalStatus: formData.get("maritalStatus") || undefined,
    profileType: formData.get("profileType"), sponsorId: formData.get("sponsorId") ?? "",
  });
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const documentNumber = data.documentNumber.toUpperCase();
  const current = await db.member.findUnique({ where: { id: memberId }, include: { investorProfile: true, ambassadorProfile: true } });
  if (!current) return { success: false, message: "El socio ya no existe." };

  try {
    await db.$transaction(async (transaction) => {
      const wantsInvestor = data.profileType === "INVESTOR" || data.profileType === "BOTH";
      const wantsAmbassador = data.profileType === "AMBASSADOR" || data.profileType === "BOTH";
      if ((current.investorProfile && !wantsInvestor) || (current.ambassadorProfile && !wantsAmbassador)) throw new Error("PROFILE_REMOVAL_NOT_ALLOWED");
      if (data.sponsorId) {
        const sponsor = await transaction.ambassadorProfile.findFirst({ where: { id: data.sponsorId, status: "ACTIVE" }, select: { id: true } });
        if (!sponsor) throw new Error("INVALID_SPONSOR");
      }
      await transaction.member.update({ where: { id: memberId }, data: { documentType: data.documentType, documentNumber, firstName: data.firstName, lastName: data.lastName, countryCode: data.countryCode, phone: data.phone || null, email: data.email, residence: data.residence || null, occupation: data.occupation || null, maritalStatus: data.maritalStatus ?? null } });
      if (wantsInvestor && !current.investorProfile) await transaction.investorProfile.create({ data: { memberId, sponsorId: data.sponsorId || null, status: "PROSPECT" } });
      if (wantsAmbassador && !current.ambassadorProfile) await transaction.ambassadorProfile.create({ data: { memberId, referralCode: current.memberCode, sponsorId: data.sponsorId || null, status: "ACTIVE" } });
      if (current.userId) await transaction.user.update({ where: { id: current.userId }, data: { email: data.email, displayName: `${data.firstName} ${data.lastName}` } });
      await transaction.auditLog.create({ data: {
        actorUserId: actor.id, action: "MEMBER_UPDATED", entityType: "Member", entityId: memberId,
        before: { documentType: current.documentType, documentNumber: current.documentNumber, firstName: current.firstName, lastName: current.lastName, countryCode: current.countryCode, phone: current.phone, email: current.email },
        after: { ...data, documentNumber, phone: data.phone || null },
      } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROFILE_REMOVAL_NOT_ALLOWED") return { success: false, message: "Los perfiles con historial no se eliminan. Puedes agregar el perfil complementario." };
    if (error instanceof Error && error.message === "INVALID_SPONSOR") return { success: false, message: "El embajador patrocinador no está disponible." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "El documento ingresado ya está registrado." };
    return { success: false, message: "No fue posible actualizar el socio." };
  }
  revalidatePath("/socios"); revalidatePath("/ventas");
  return { success: true, message: "Socio actualizado correctamente." };
}

export async function resendInvitationAction(memberId: string, _previousState: CreateMemberState, _formData: FormData): Promise<CreateMemberState> {
  const actor = await requirePermission("MEMBERS");
  void _previousState; void _formData;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { success: false, message: "Persona inválida." };
  const member = await db.member.findUnique({ where: { id: memberId }, include: { user: true, investorProfile: true, ambassadorProfile: true } });
  if (!member) return { success: false, message: "La persona ya no existe." };
  if (member.user?.status === "ACTIVE") return { success: false, message: "La cuenta ya está activa." };
  const token = createSecureToken();
  let invitationUserId = member.user?.id ?? "";
  await db.$transaction(async (transaction) => {
    if (!invitationUserId) {
      const user = await transaction.user.create({ data: { email: member.email, displayName: `${member.firstName} ${member.lastName}`, status: "INVITED" } });
      invitationUserId = user.id;
      await transaction.member.update({ where: { id: member.id }, data: { userId: user.id } });
      const roleCodes = [member.investorProfile ? "MEMBER" : null, member.ambassadorProfile ? "AMBASSADOR" : null].filter((value): value is string => Boolean(value));
      const roles = await transaction.role.findMany({ where: { code: { in: roleCodes } }, select: { id: true } });
      if (roles.length) await transaction.userRole.createMany({ data: roles.map((role) => ({ userId: user.id, roleId: role.id })) });
    }
    await transaction.accountInvitation.updateMany({ where: { userId: invitationUserId, consumedAt: null }, data: { consumedAt: new Date() } });
    await transaction.accountInvitation.create({ data: { userId: invitationUserId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  });
  const delivery = await sendAccountInvitation({ email: member.email, name: member.firstName, token });
  await db.auditLog.create({ data: { actorUserId: actor.id, action: delivery.sent ? "INVITATION_RESENT" : "INVITATION_DELIVERY_FAILED", entityType: "Member", entityId: member.id, after: delivery.sent ? { email: member.email } : { reason: delivery.reason } } });
  return { success: delivery.sent, message: delivery.sent ? "Invitación reenviada correctamente." : "No se pudo enviar. Verifica RESEND_API_KEY y EMAIL_FROM." };
}

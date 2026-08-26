"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const memberSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PASSPORT", "RUC"], { message: "Selecciona un tipo de documento" }),
  documentNumber: z.string().trim().min(6, "Ingresa al menos 6 caracteres").max(20, "Máximo 20 caracteres").regex(/^[A-Za-z0-9-]+$/, "Usa solo letras, números y guiones"),
  firstName: z.string().trim().min(2, "Ingresa los nombres").max(100, "Máximo 100 caracteres"),
  lastName: z.string().trim().min(2, "Ingresa los apellidos").max(100, "Máximo 100 caracteres"),
  countryCode: z.enum(["PE", "CO", "EC", "CL", "US"], { message: "Selecciona un país" }),
  phone: z.string().trim().max(30, "Máximo 30 caracteres").regex(/^[+0-9() -]*$/, "Número de teléfono inválido"),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido").max(255, "Máximo 255 caracteres"),
});

export type CreateMemberState = {
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof z.infer<typeof memberSchema>, string[]>>;
};

export async function createMemberAction(_previousState: CreateMemberState, formData: FormData): Promise<CreateMemberState> {
  // Authentication and role authorization will be enforced here when the login module is enabled.
  const parsed = memberSchema.safeParse({
    documentType: formData.get("documentType"),
    documentNumber: formData.get("documentNumber"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const documentNumber = data.documentNumber.toUpperCase();

  const duplicate = await db.member.findUnique({
    where: { documentType_documentNumber: { documentType: data.documentType, documentNumber } },
    select: { id: true },
  });

  if (duplicate) {
    return { success: false, message: "Ya existe un socio con ese tipo y número de documento." };
  }

  try {
    await db.$transaction(async (transaction) => {
      const member = await transaction.member.create({
        data: {
          documentType: data.documentType,
          documentNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          countryCode: data.countryCode,
          phone: data.phone || null,
          email: data.email,
          status: "PROSPECT",
        },
        select: { id: true },
      });

      await transaction.auditLog.create({
        data: {
          action: "MEMBER_CREATED",
          entityType: "Member",
          entityId: member.id,
          after: {
            documentType: data.documentType,
            documentNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            countryCode: data.countryCode,
            email: data.email,
            status: "PROSPECT",
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "El documento ingresado ya está registrado." };
    }
    return { success: false, message: "No fue posible guardar el socio. Inténtalo nuevamente." };
  }

  revalidatePath("/socios");
  return { success: true, message: "Socio registrado correctamente." };
}

export async function updateMemberAction(memberId: string, _previousState: CreateMemberState, formData: FormData): Promise<CreateMemberState> {
  // Authentication and role authorization will be enforced here when the login module is enabled.
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { success: false, message: "Socio inválido." };
  const parsed = memberSchema.safeParse({
    documentType: formData.get("documentType"), documentNumber: formData.get("documentNumber"),
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    countryCode: formData.get("countryCode"), phone: formData.get("phone") ?? "", email: formData.get("email"),
  });
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const documentNumber = data.documentNumber.toUpperCase();
  const current = await db.member.findUnique({ where: { id: memberId } });
  if (!current) return { success: false, message: "El socio ya no existe." };

  try {
    await db.$transaction(async (transaction) => {
      await transaction.member.update({ where: { id: memberId }, data: { ...data, documentNumber, phone: data.phone || null } });
      await transaction.auditLog.create({ data: {
        action: "MEMBER_UPDATED", entityType: "Member", entityId: memberId,
        before: { documentType: current.documentType, documentNumber: current.documentNumber, firstName: current.firstName, lastName: current.lastName, countryCode: current.countryCode, phone: current.phone, email: current.email },
        after: { ...data, documentNumber, phone: data.phone || null },
      } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "El documento ingresado ya está registrado." };
    return { success: false, message: "No fue posible actualizar el socio." };
  }
  revalidatePath("/socios"); revalidatePath("/ventas");
  return { success: true, message: "Socio actualizado correctamente." };
}

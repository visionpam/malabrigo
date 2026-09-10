"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";

const profileSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido").max(255),
  phone: z.string().trim().max(30, "Máximo 30 caracteres").regex(/^[+0-9() -]*$/, "Número de teléfono inválido"),
  countryCode: z.enum(["PE", "CO", "EC", "CL", "US"], { message: "Selecciona un país" }),
  residence: z.string().trim().max(180, "Máximo 180 caracteres"),
  occupation: z.string().trim().max(140, "Máximo 140 caracteres"),
});

export type ProfileState = { success: boolean; message: string; errors?: Partial<Record<keyof z.infer<typeof profileSchema>, string[]>> };

export async function updateOwnProfileAction(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (!user.member) return { success: false, message: "Esta cuenta administrativa no tiene un perfil personal asociado." };
  const member = user.member;
  const parsed = profileSchema.safeParse({ email: formData.get("email"), phone: formData.get("phone") ?? "", countryCode: formData.get("countryCode"), residence: formData.get("residence") ?? "", occupation: formData.get("occupation") ?? "" });
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  try {
    await db.$transaction(async (transaction) => {
      await transaction.member.update({ where: { id: member.id }, data: { email: data.email, phone: data.phone || null, countryCode: data.countryCode, residence: data.residence || null, occupation: data.occupation || null } });
      await transaction.user.update({ where: { id: user.id }, data: { email: data.email } });
      await transaction.auditLog.create({ data: { actorUserId: user.id, action: "OWN_PROFILE_UPDATED", entityType: "Member", entityId: member.id, before: { email: member.email, phone: member.phone, countryCode: member.countryCode, residence: member.residence, occupation: member.occupation }, after: data } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "El correo ya está registrado por otra cuenta." };
    return { success: false, message: "No fue posible actualizar tus datos." };
  }
  revalidatePath("/mi-cuenta");
  return { success: true, message: "Datos de contacto actualizados correctamente." };
}

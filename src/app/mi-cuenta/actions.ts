"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/access-control";

const profileSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido").max(255),
  phone: z.string().trim().max(30, "Máximo 30 caracteres").regex(/^[+0-9() -]*$/, "Número de teléfono inválido"),
  countryCode: z.string().trim().length(2, "Selecciona un país").transform((value) => value.toUpperCase()),
  regionCode: z.string().trim().max(20).optional(), provinceCode: z.string().trim().max(24).optional(), districtCode: z.string().trim().max(24).optional(),
  residence: z.string().trim().max(180, "Máximo 180 caracteres"),
  occupation: z.string().trim().max(140, "Máximo 140 caracteres"),
});

export type ProfileState = { success: boolean; message: string; errors?: Partial<Record<keyof z.infer<typeof profileSchema>, string[]>> };

export async function updateOwnProfileAction(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (!user.member) return { success: false, message: "Esta cuenta administrativa no tiene un perfil personal asociado." };
  const member = user.member;
  const parsed = profileSchema.safeParse({ email: formData.get("email"), phone: formData.get("phone") ?? "", countryCode: formData.get("countryCode"), regionCode: formData.get("regionCode") || undefined, provinceCode: formData.get("provinceCode") || undefined, districtCode: formData.get("districtCode") || undefined, residence: formData.get("residence") ?? "", occupation: formData.get("occupation") ?? "" });
  if (!parsed.success) return { success: false, message: "Revisa los campos marcados.", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const country = await db.country.findUnique({ where: { code: parsed.data.countryCode }, select: { code: true } });
  if (!country) return { success: false, message: "El país seleccionado ya no está disponible.", errors: { countryCode: ["Selecciona un país válido"] } };
  const regionCount = await db.addressRegion.count({ where: { countryCode: data.countryCode, active: true } });
  if (regionCount && (!data.regionCode || !data.provinceCode || !data.districtCode)) return { success: false, message: "Completa la división territorial para el país seleccionado." };
  if (data.districtCode && data.provinceCode && data.regionCode) { const district = await db.addressDistrict.findFirst({ where: { code: data.districtCode, provinceCode: data.provinceCode, active: true }, include: { province: { include: { region: true } } } }); if (!district || district.province.regionCode !== data.regionCode || district.province.region.countryCode !== data.countryCode) return { success: false, message: "La región, provincia y distrito no corresponden al país seleccionado." }; }
  if (parsed.data.occupation && !await db.occupationOption.findFirst({ where: { code: parsed.data.occupation, active: true }, select: { code: true } })) return { success: false, message: "La ocupación seleccionada ya no está disponible.", errors: { occupation: ["Selecciona una ocupación válida"] } };
  try {
    await db.$transaction(async (transaction) => {
      await transaction.member.update({ where: { id: member.id }, data: { email: data.email, phone: data.phone || null, countryCode: data.countryCode, regionCode: data.regionCode || null, provinceCode: data.provinceCode || null, districtCode: data.districtCode || null, residence: data.residence || null, occupation: data.occupation || null } });
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

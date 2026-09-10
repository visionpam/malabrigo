import "server-only";
import { db } from "@/lib/db";

export async function getAmbassadorNetwork(ambassadorId: string) {
  const seen = new Set<string>();
  const levels: { level: number; people: { memberId: string; memberCode: string; name: string; document: string; status: string; profile: string; sales: number; volume: number; createdAt: Date }[] }[] = [];
  let frontier = [ambassadorId];
  for (let level = 1; level <= 8 && frontier.length; level++) {
    const [ambassadors, investors] = await Promise.all([
      db.ambassadorProfile.findMany({ where: { sponsorId: { in: frontier } }, include: { member: { include: { sales: { where: { status: { not: "CANCELLED" } }, select: { totalPrice: true } }, investorProfile: true } } } }),
      db.investorProfile.findMany({ where: { sponsorId: { in: frontier } }, include: { member: { include: { sales: { where: { status: { not: "CANCELLED" } }, select: { totalPrice: true } }, ambassadorProfile: true } } } }),
    ]);
    const people: (typeof levels)[number]["people"] = [];
    for (const entry of [...ambassadors.map((item) => ({ member: item.member, status: item.status, createdAt: item.affiliatedAt, profile: item.member.investorProfile ? "Embajador e inversionista" : "Embajador" })), ...investors.map((item) => ({ member: item.member, status: item.status, createdAt: item.createdAt, profile: item.member.ambassadorProfile ? "Embajador e inversionista" : "Inversionista" }))]) {
      if (seen.has(entry.member.id)) continue; seen.add(entry.member.id);
      people.push({ memberId: entry.member.id, memberCode: entry.member.memberCode, name: `${entry.member.firstName} ${entry.member.lastName}`, document: `${entry.member.documentType} ${entry.member.documentNumber}`, status: entry.status, profile: entry.profile, sales: entry.member.sales.length, volume: entry.member.sales.reduce((sum, sale) => sum + Number(sale.totalPrice), 0), createdAt: entry.createdAt });
    }
    levels.push({ level, people });
    frontier = ambassadors.map((item) => item.id);
  }
  return levels;
}

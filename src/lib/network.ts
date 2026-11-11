import "server-only";
import { db } from "@/lib/db";

export async function getAmbassadorNetwork(ambassadorId: string) {
  const seen = new Set<string>();
  const levels: { level: number; people: { memberId: string; memberCode: string; name: string; document: string; status: string; profile: string; memberType: "Inversionista" | "Embajador" | "Mixto"; sales: number; volume: number; programs: string[]; createdAt: Date }[] }[] = [];
  let frontier = [ambassadorId];
  for (let level = 1; level <= 8 && frontier.length; level++) {
    const [ambassadors, investors] = await Promise.all([
      db.ambassadorProfile.findMany({ where: { sponsorId: { in: frontier } }, include: { member: { include: { sales: { where: { status: { not: "CANCELLED" } }, select: { totalPrice: true, program: { select: { name: true } } } }, investorProfile: true } } } }),
      db.investorProfile.findMany({ where: { sponsorId: { in: frontier } }, include: { member: { include: { sales: { where: { status: { not: "CANCELLED" } }, select: { totalPrice: true, program: { select: { name: true } } } }, ambassadorProfile: true } } } }),
    ]);
    const people: (typeof levels)[number]["people"] = [];
    for (const entry of [...ambassadors.map((item) => ({ member: item.member, status: item.member.investorProfile?.networkApprovalStatus === "PENDING" ? "PENDING" : item.status, createdAt: item.affiliatedAt, memberType: item.member.investorProfile ? "Mixto" as const : "Embajador" as const })), ...investors.map((item) => ({ member: item.member, status: item.networkApprovalStatus, createdAt: item.createdAt, memberType: item.member.ambassadorProfile ? "Mixto" as const : "Inversionista" as const }))]) {
      if (seen.has(entry.member.id)) continue; seen.add(entry.member.id);
      people.push({ memberId: entry.member.id, memberCode: entry.member.memberCode, name: `${entry.member.firstName} ${entry.member.lastName}`, document: `${entry.member.documentType} ${entry.member.documentNumber}`, status: entry.status, profile: entry.memberType === "Mixto" ? "Embajador e inversionista" : entry.memberType, memberType: entry.memberType, sales: entry.member.sales.length, volume: entry.member.sales.reduce((sum, sale) => sum + Number(sale.totalPrice), 0), programs: [...new Set(entry.member.sales.map((sale) => sale.program.name))], createdAt: entry.createdAt });
    }
    levels.push({ level, people });
    frontier = ambassadors.map((item) => item.id);
  }
  return levels;
}

import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand-logo compact" : "brand-logo"}>
      <Image src="/branding/malabrigo-club-resort.png" alt="GM Club Resort" width={2444} height={3203} priority />
    </div>
  );
}

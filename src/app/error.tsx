"use client";

import { ServiceUnavailable } from "@/components/service-unavailable";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ServiceUnavailable retry={retry} />;
}

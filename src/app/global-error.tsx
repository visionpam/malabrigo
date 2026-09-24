"use client";

import { ServiceUnavailable } from "@/components/service-unavailable";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="es"><body style={{ margin: 0 }}><ServiceUnavailable retry={retry} /></body></html>;
}

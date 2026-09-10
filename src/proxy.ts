import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/iniciar-sesion", "/activar-cuenta", "/recuperar-contrasena", "/restablecer-contrasena"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicRoutes.some((route) => pathname.startsWith(route))) return NextResponse.next();
  if (!request.cookies.get("malabrigo_session")?.value) return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };

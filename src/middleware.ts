import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  canActor,
  getRequiredActionForPath,
} from "@/lib/auth/permissions";
import { sessionOptions, StaffSessionData } from "@/lib/auth/session";

const PUBLIC_PATH_PATTERNS = [
  /^\/$/,
  /^\/r\/[^/]+\/t\/[^/]+$/,
  /^\/r\/[^/]+\/staff$/,
  /^\/api\/auth\/staff/,
  /^\/api\/restaurants\/[^/]+\/tables\/[^/]+\/bootstrap$/,
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function extractSlug(pathname: string): string | null {
  const match = pathname.match(/^\/r\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const requiredAction = getRequiredActionForPath(pathname);
  if (!requiredAction) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<StaffSessionData>(
    request,
    response,
    sessionOptions
  );

  const slug = extractSlug(pathname);

  if (!session.staffId || !session.role) {
    if (slug) {
      return NextResponse.redirect(
        new URL(`/r/${slug}/staff`, request.url)
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (slug && session.restaurantSlug !== slug) {
    return NextResponse.redirect(
      new URL(`/r/${slug}/staff`, request.url)
    );
  }

  if (!canActor(session.role, requiredAction)) {
    return NextResponse.redirect(
      new URL(`/r/${slug ?? session.restaurantSlug}/staff`, request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  canActor,
  getRequiredActionForPath,
} from "@/lib/auth/permissions";
import { sessionOptions, StaffSessionData } from "@/lib/auth/session";
import {
  platformSessionOptions,
  PlatformSessionData,
} from "@/lib/auth/platform-session";

const PUBLIC_PATH_PATTERNS = [
  /^\/$/,
  /^\/r\/[^/]+\/t\/[^/]+$/,
  /^\/r\/[^/]+\/staff$/,
  /^\/api\/auth\/staff/,
  /^\/api\/restaurants\/[^/]+\/tables\/[^/]+\/bootstrap$/,
];

const PLATFORM_PUBLIC_PATH_PATTERNS = [
  /^\/platform\/login$/,
  /^\/api\/platform\/auth\/login$/,
];

function isPlatformPath(pathname: string): boolean {
  return (
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname.startsWith("/api/platform/")
  );
}

function isPlatformPublicPath(pathname: string): boolean {
  return PLATFORM_PUBLIC_PATH_PATTERNS.some((pattern) =>
    pattern.test(pathname)
  );
}

async function handlePlatformRequest(
  request: NextRequest,
  pathname: string
): Promise<NextResponse> {
  if (isPlatformPublicPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<PlatformSessionData>(
    request,
    response,
    platformSessionOptions
  );

  if (!session.platformAdminId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/platform/login", request.url));
  }

  return response;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function extractSlug(pathname: string): string | null {
  const match = pathname.match(/^\/r\/([^/]+)/);
  return match?.[1] ?? null;
}

function buildRedirectUrl(request: NextRequest, pathname: string): URL {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedHost) {
    return new URL(
      `${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}${pathname}`
    );
  }

  return new URL(pathname, request.url);
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

  if (isPlatformPath(pathname)) {
    return handlePlatformRequest(request, pathname);
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
      return NextResponse.redirect(buildRedirectUrl(request, `/r/${slug}/staff`));
    }
    return NextResponse.redirect(buildRedirectUrl(request, "/"));
  }

  if (slug && session.restaurantSlug !== slug) {
    return NextResponse.redirect(buildRedirectUrl(request, `/r/${slug}/staff`));
  }

  if (!canActor(session.role, requiredAction)) {
    return NextResponse.redirect(
      buildRedirectUrl(request, `/r/${slug ?? session.restaurantSlug}/staff`)
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

import { PlatformAdminRole } from "@prisma/client";
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface PlatformSessionData {
  platformAdminId: string;
  role: PlatformAdminRole;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const useSecureCookies =
  process.env.NODE_ENV === "production" && appUrl?.startsWith("https://");

export const platformSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "platform_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    path: "/",
  },
};

export async function getPlatformSession() {
  const cookieStore = await cookies();
  return getIronSession<PlatformSessionData>(
    cookieStore,
    platformSessionOptions
  );
}

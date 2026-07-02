import { StaffRole } from "@prisma/client";
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface StaffSessionData {
  staffId: string;
  restaurantId: string;
  restaurantSlug: string;
  role: StaffRole;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const useSecureCookies =
  process.env.NODE_ENV === "production" && appUrl?.startsWith("https://");

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "staff_session",
  cookieOptions: {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    path: "/",
  },
};

export async function getStaffSession() {
  const cookieStore = await cookies();
  return getIronSession<StaffSessionData>(cookieStore, sessionOptions);
}

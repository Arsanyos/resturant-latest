import { StaffRole } from "@prisma/client";
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface StaffSessionData {
  staffId: string;
  restaurantId: string;
  restaurantSlug: string;
  role: StaffRole;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "staff_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getStaffSession() {
  const cookieStore = await cookies();
  return getIronSession<StaffSessionData>(cookieStore, sessionOptions);
}

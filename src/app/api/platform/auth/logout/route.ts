import { NextResponse } from "next/server";
import { logoutPlatformAdmin } from "@/lib/platform-admin/auth";

export async function POST() {
  await logoutPlatformAdmin();
  return NextResponse.json({ ok: true });
}

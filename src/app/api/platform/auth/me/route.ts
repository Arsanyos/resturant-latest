import { NextResponse } from "next/server";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin/auth";

export async function GET() {
  const admin = await getCurrentPlatformAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(admin);
}

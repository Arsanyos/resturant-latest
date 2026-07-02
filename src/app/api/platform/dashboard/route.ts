import { NextResponse } from "next/server";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import { getPlatformDashboard } from "@/lib/platform-admin/queries";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const data = await getPlatformDashboard();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Platform dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

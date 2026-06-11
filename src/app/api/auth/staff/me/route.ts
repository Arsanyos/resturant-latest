import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/service";

export async function GET() {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(staff);
}

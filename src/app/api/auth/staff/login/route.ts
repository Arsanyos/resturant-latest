import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError, loginStaff } from "@/lib/auth/service";
import { staffLoginSchema } from "@/lib/validation/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = staffLoginSchema.parse(body);
    const staff = await loginStaff(input);
    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Staff login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

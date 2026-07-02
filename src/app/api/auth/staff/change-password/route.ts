import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  AuthError,
  changeCurrentStaffPassword,
} from "@/lib/auth/service";
import { changeStaffPasswordSchema } from "@/lib/validation/staff";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = changeStaffPasswordSchema.parse(body);
    const result = await changeCurrentStaffPassword(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Staff change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

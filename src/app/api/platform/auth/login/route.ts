import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  loginPlatformAdmin,
  PlatformAuthError,
} from "@/lib/platform-admin/auth";
import { platformLoginSchema } from "@/lib/validation/platform-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = platformLoginSchema.parse(body);
    const admin = await loginPlatformAdmin(input);
    return NextResponse.json(admin);
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Platform login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

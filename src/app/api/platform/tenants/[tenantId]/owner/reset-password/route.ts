import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import {
  PlatformTenantError,
  resetTenantOwnerPassword,
} from "@/lib/platform-admin/service";
import { resetTenantOwnerPasswordSchema } from "@/lib/validation/platform-tenant";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    const { tenantId } = await context.params;
    const body = await request.json();
    const input = resetTenantOwnerPasswordSchema.parse(body);
    const result = await resetTenantOwnerPassword(tenantId, input, admin);
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof PlatformAuthError ||
      error instanceof PlatformTenantError
    ) {
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
    console.error("Platform owner password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import {
  updateTenantAd,
  PlatformTenantError,
} from "@/lib/platform-admin/service";
import { updateTenantAdSchema } from "@/lib/validation/platform-tenant";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    const { tenantId } = await context.params;
    const body = await request.json();
    const input = updateTenantAdSchema.parse(body);
    const data = await updateTenantAd(tenantId, input, admin);
    return NextResponse.json(data);
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
    console.error("Tenant ad PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

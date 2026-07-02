import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import {
  getTenantDetail,
  PlatformQueryError,
} from "@/lib/platform-admin/queries";
import { updateTenant, PlatformTenantError } from "@/lib/platform-admin/service";
import { updateTenantSchema } from "@/lib/validation/platform-tenant";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await context.params;
    const data = await getTenantDetail(tenantId);
    return NextResponse.json(data);
  } catch (error) {
    if (
      error instanceof PlatformAuthError ||
      error instanceof PlatformQueryError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Tenant GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const admin = await requirePlatformAdmin();
    const { tenantId } = await context.params;
    const body = await request.json();
    const input = updateTenantSchema.parse(body);
    const data = await updateTenant(tenantId, input, admin);
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
    console.error("Tenant PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

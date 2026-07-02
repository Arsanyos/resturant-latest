import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import { listTenants } from "@/lib/platform-admin/queries";
import { createTenant, PlatformTenantError } from "@/lib/platform-admin/service";
import { createTenantSchema } from "@/lib/validation/platform-tenant";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const data = await listTenants();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Tenants GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    const body = await request.json();
    const input = createTenantSchema.parse(body);
    const tenant = await createTenant(input, admin);
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof PlatformAuthError || error instanceof PlatformTenantError) {
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
    console.error("Tenants POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

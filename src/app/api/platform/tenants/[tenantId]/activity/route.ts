import { NextRequest, NextResponse } from "next/server";
import {
  PlatformAuthError,
  requirePlatformAdmin,
} from "@/lib/platform-admin/auth";
import {
  getTenantActivity,
  PlatformQueryError,
} from "@/lib/platform-admin/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { tenantId } = await context.params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") ?? undefined;
    const limitParam = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 200)
        : 50;

    const data = await getTenantActivity(tenantId, { action, limit });
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
    console.error("Tenant activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

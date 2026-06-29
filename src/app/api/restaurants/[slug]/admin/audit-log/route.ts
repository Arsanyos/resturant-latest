import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { StaffAuthError } from "@/lib/auth/require-staff";
import { requireOwner } from "@/lib/auth/require-owner";
import { AdminError, getAuditLogs } from "@/lib/admin/service";
import { auditLogQuerySchema } from "@/lib/validation/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    await requireOwner(slug);
    const query = auditLogQuerySchema.parse({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      staffId: request.nextUrl.searchParams.get("staffId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const data = await getAuditLogs(slug, query);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof StaffAuthError || error instanceof AdminError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createAssistanceRequest,
  getSessionAssistanceStatus,
  OrderError,
} from "@/lib/orders/service";
import { assistanceRequestSchema } from "@/lib/validation/order";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const data = await getSessionAssistanceStatus(sessionId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Assistance status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const input = assistanceRequestSchema.parse(body);

    const result = await createAssistanceRequest(
      sessionId,
      input.deviceInfo,
      input.tableId
    );

    return NextResponse.json({
      id: result.id,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Assistance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

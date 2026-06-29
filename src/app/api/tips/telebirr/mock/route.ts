import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { processMockTipTelebirr, TipError } from "@/lib/tips/service";
import { mockTipTelebirrSchema } from "@/lib/validation/tip";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = mockTipTelebirrSchema.parse(body);
    const result = await processMockTipTelebirr(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TipError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Mock tip Telebirr error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

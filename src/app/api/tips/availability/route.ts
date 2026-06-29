import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTipAvailability, TipError } from "@/lib/tips/service";
import { tipAvailabilitySchema } from "@/lib/validation/tip";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const input = tipAvailabilitySchema.parse({ sessionId });
    const data = await getTipAvailability(input.sessionId);
    return NextResponse.json(data);
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
    console.error("Tip availability error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

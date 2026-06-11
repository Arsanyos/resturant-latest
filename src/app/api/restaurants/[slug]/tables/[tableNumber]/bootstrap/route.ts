import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getBootstrapData } from "@/lib/restaurants/bootstrap";
import { bootstrapQuerySchema } from "@/lib/validation/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; tableNumber: string }> }
) {
  try {
    const { slug, tableNumber: tableNumberRaw } = await context.params;
    const tableNumber = Number(tableNumberRaw);

    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
    }

    const query = bootstrapQuerySchema.parse({
      deviceToken: request.nextUrl.searchParams.get("deviceToken") ?? undefined,
    });

    const data = await getBootstrapData(slug, tableNumber, query.deviceToken);

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Bootstrap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { resetTicketStatus } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await resetTicketStatus(id);
    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

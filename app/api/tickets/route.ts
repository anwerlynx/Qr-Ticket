import { NextResponse } from "next/server";
import { getAllTickets, issueTicket } from "@/lib/db";

export async function GET() {
  try {
    const tickets = await getAllTickets();
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.attendeeName) {
      return NextResponse.json(
        { success: false, error: "اسم الحضور مطلوب (attendeeName is required)" },
        { status: 400 }
      );
    }

    const ticket = await issueTicket({
      attendeeName: body.attendeeName,
      attendeeEmail: body.attendeeEmail,
      category: body.category,
      ticketNumber: body.ticketNumber,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

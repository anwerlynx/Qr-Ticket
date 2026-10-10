import { NextResponse } from "next/server";
import { issueBulkTickets } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const attendeeIds = body.attendeeIds as string[] | undefined;

    const result = await issueBulkTickets(attendeeIds);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("Bulk ticket generation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء إصدار التذاكر الجماعي" },
      { status: 500 }
    );
  }
}

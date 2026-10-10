import { NextResponse } from "next/server";
import { updateAttendeeApprovalStatus } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvalStatus } = body;

    if (!approvalStatus || !["accepted", "pending", "rejected"].includes(approvalStatus)) {
      return NextResponse.json(
        { success: false, error: "حالة القبول غير صالحة" },
        { status: 400 }
      );
    }

    const updated = await updateAttendeeApprovalStatus(id, approvalStatus);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "المشارك غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      attendee: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

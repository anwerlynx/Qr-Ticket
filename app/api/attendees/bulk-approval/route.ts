import { NextResponse } from "next/server";
import { bulkUpdateAttendeeApprovalStatus } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, approvalStatus } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المشاركين المراد تعديل حالتهم" },
        { status: 400 }
      );
    }

    if (!approvalStatus || !["accepted", "pending", "rejected"].includes(approvalStatus)) {
      return NextResponse.json(
        { success: false, error: "حالة القبول غير صالحة" },
        { status: 400 }
      );
    }

    const result = await bulkUpdateAttendeeApprovalStatus(ids, approvalStatus);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      message: `تم تحديث حالة ${result.updatedCount} مشارك إلى "${approvalStatus === "accepted" ? "مقبول" : approvalStatus === "pending" ? "قيد المراجعة" : "مرفوض"}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

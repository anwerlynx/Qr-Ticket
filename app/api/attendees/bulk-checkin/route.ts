import { NextResponse } from "next/server";
import { bulkUpdateAttendeeAttendanceStatus } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المشاركين المراد تعديل حالة حضورهم" },
        { status: 400 }
      );
    }

    if (!status || !["checked_in", "registered"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "حالة الحضور غير صالحة" },
        { status: 400 }
      );
    }

    const result = await bulkUpdateAttendeeAttendanceStatus(ids, status);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      message: `تم تحديث حالة حضور ${result.updatedCount} مشارك إلى "${status === "checked_in" ? "حاضر ✓" : "لم يحضر بعد"}" بنجاح.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

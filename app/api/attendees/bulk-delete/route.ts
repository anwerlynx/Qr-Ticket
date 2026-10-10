import { NextResponse } from "next/server";
import { deleteAttendeesBulk } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد عنصر واحد على الأقل للحذف" },
        { status: 400 }
      );
    }

    const { deletedCount } = await deleteAttendeesBulk(ids);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `تم حذف ${deletedCount} مشارك وتذاكرهم المرتبطة بنجاح من قاعدة البيانات`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل حذف المشاركين المحددين" },
      { status: 500 }
    );
  }
}

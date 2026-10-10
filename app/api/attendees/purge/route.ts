import { NextResponse } from "next/server";
import { purgeAllDatabaseData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanConf = (body?.confirmation || "").toString().trim().toUpperCase();
    const isConfirmed = cleanConf === "DELETE" || cleanConf === "حذف" || body?.confirmed === true;

    if (!isConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error: "يجب تأكيد الحذف النهائي بكتابة كلمة 'DELETE' أو 'حذف'",
        },
        { status: 400 }
      );
    }

    const result = await purgeAllDatabaseData();

    return NextResponse.json({
      success: true,
      message: `تم تفريغ وحذف جميع البيانات بنجاح: تم حذف ${result.purgedAttendeesCount} حاضر و ${result.purgedTicketsCount} تذكرة. قاعدة البيانات الآن جاهزة لاستيراد ملف جديد.`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل تفريغ قاعدة البيانات" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { clearAttendeeColumn } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { column } = body;

    if (!column) {
      return NextResponse.json(
        { success: false, error: "يجب تحديد اسم العمود المراد تفريغه" },
        { status: 400 }
      );
    }

    const result = await clearAttendeeColumn(column);

    return NextResponse.json({
      success: true,
      message: `تم تفريغ عمود ${column} لعدد ${result.affectedCount} حاضر بنجاح`,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "فشل تفريغ العمود" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { mapRowsToAttendees } from "@/lib/excel-parser";
import { importAttendeesBulk } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows, mapping } = body;

    if (!rows || !Array.isArray(rows) || !mapping) {
      return NextResponse.json(
        { success: false, error: "البيانات أو تعيين الأعمدة غير مكتمل" },
        { status: 400 }
      );
    }

    if (!mapping.nameColumn || !mapping.emailColumn) {
      return NextResponse.json(
        { success: false, error: "يجب اختيار عمود الاسم وعمود البريد الإلكتروني على الأقل" },
        { status: 400 }
      );
    }

    const normalizedRecords = mapRowsToAttendees(rows, mapping);

    // Run full validation against database (detecting duplicates in file and existing in DB)
    // Note: this step only validates without committing, so we can show summary before import!
    const previewResult = await importAttendeesBulk(normalizedRecords);

    return NextResponse.json({
      success: true,
      validation: previewResult,
    });
  } catch (err: any) {
    console.error("Validation error:", err);
    return NextResponse.json(
      { success: false, error: `فشل التحقق من البيانات: ${err.message}` },
      { status: 500 }
    );
  }
}

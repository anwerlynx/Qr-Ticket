import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseSpreadsheetBuffer, mapRowsToAttendees } from "@/lib/excel-parser";
import { importAttendeesBulk } from "@/lib/db";

export async function POST() {
  try {
    const candidatePaths = [
      "C:\\Users\\Anwar\\Downloads\\Next gen.xlsx",
      path.join(process.cwd(), "Next gen.xlsx"),
      path.join(process.cwd(), "data", "Next gen.xlsx"),
    ];

    let filePath = "";
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على ملف Next gen.xlsx في مسار التنزيلات" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(filePath);
    const parsed = parseSpreadsheetBuffer(buffer);

    if (parsed.totalRows === 0) {
      return NextResponse.json(
        { success: false, error: "الملف فارغ" },
        { status: 400 }
      );
    }

    // Map all rows using auto-detected mapping
    const normalizedRecords = mapRowsToAttendees(parsed.rows, parsed.suggestedMapping);

    // Import all into database
    const importResult = await importAttendeesBulk(normalizedRecords);

    return NextResponse.json({
      success: true,
      filePath,
      totalRows: parsed.totalRows,
      importResult,
      message: `تم استيراد ${importResult.validCount} مسجل جديد بنجاح وتخطي ${importResult.existingInDbCount} مسجلين موجودين مسبقاً.`,
    });
  } catch (err: any) {
    console.error("Local excel import error:", err);
    return NextResponse.json(
      { success: false, error: `فشل استيراد الملف: ${err.message}` },
      { status: 500 }
    );
  }
}

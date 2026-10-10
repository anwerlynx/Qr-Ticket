import { NextResponse } from "next/server";
import { parseSpreadsheetBuffer } from "@/lib/excel-parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "لم يتم العثور على ملف للرفع" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseSpreadsheetBuffer(Buffer.from(buffer));

    if (parsed.totalRows === 0) {
      return NextResponse.json(
        { success: false, error: "الملف المرفوع فارغ أو لا يحتوي على صفوف بيانات" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 10),
      allRows: parsed.rows,
      suggestedMapping: parsed.suggestedMapping,
    });
  } catch (err: any) {
    console.error("Import preview error:", err);
    return NextResponse.json(
      { success: false, error: `فشل قراءة الملف: ${err.message}` },
      { status: 500 }
    );
  }
}

// GET endpoint to check if Next gen.xlsx exists on the computer and load it
export async function GET() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const defaultPaths = [
      "C:\\Users\\Anwar\\Downloads\\Next gen.xlsx",
      path.join(process.cwd(), "Next gen.xlsx"),
      path.join(process.cwd(), "data", "Next gen.xlsx"),
    ];

    let foundPath = "";
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return NextResponse.json({
        available: false,
        message: "الملف غير موجود في المسار الافتراضي",
      });
    }

    const buffer = fs.readFileSync(foundPath);
    const parsed = parseSpreadsheetBuffer(buffer);

    return NextResponse.json({
      available: true,
      filePath: foundPath,
      fileName: path.basename(foundPath),
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 10),
      allRows: parsed.rows,
      suggestedMapping: parsed.suggestedMapping,
    });
  } catch (err: any) {
    return NextResponse.json({
      available: false,
      error: err.message,
    });
  }
}

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAllTickets } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const status = searchParams.get("status") || "all";

    const allTickets = await getAllTickets();

    const filtered = allTickets.filter((t) => {
      if (status === "all") return true;
      return t.status === status;
    });

    const exportRows = filtered.map((t, idx) => ({
      "م": idx + 1,
      "رقم التذكرة": t.ticketNumber,
      "اسم المشارك": t.attendeeName,
      "البريد الإلكتروني": t.attendeeEmail || "",
      "الهاتف": t.attendeePhone || "",
      "الفئة": t.category || "General",
      "حالة الدخول":
        t.status === "used"
          ? "تم تسجيل الدخول"
          : t.status === "valid"
          ? "صالحة (لم يدخل بعد)"
          : "ملغاة",
      "وقت تسجيل الدخول": t.checkedInAt ? new Date(t.checkedInAt).toLocaleString("ar-EG") : "—",
      "بوابة الدخول": t.checkInStation || "—",
      "رمز الدخول المشفر": t.secureCredential,
      "تاريخ الإصدار": t.issuedAt ? new Date(t.issuedAt).toLocaleString("ar-EG") : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف التذاكر والحضور");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="NextGen_Tickets_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="NextGen_Tickets_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

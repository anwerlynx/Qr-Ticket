import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAllAttendees } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const approval = searchParams.get("approval") || "all";
    const ticketFilter = searchParams.get("ticket") || "all";

    const allAttendees = await getAllAttendees();

    // Filter
    const filtered = allAttendees.filter((a) => {
      const matchApproval = approval === "all" || (a.approvalStatus || "accepted") === approval;
      const matchTicket =
        ticketFilter === "all" ||
        (ticketFilter === "with_ticket" && a.hasTicket) ||
        (ticketFilter === "no_ticket" && !a.hasTicket);
      return matchApproval && matchTicket;
    });

    // Map to Arabic business spreadsheet columns
    const exportRows = filtered.map((a, idx) => ({
      "م": idx + 1,
      "الاسم الكامل": a.name,
      "البريد الإلكتروني": a.email,
      "رقم الواتساب / الهاتف": a.whatsapp || a.phone || "",
      "الوظيفة": a.job || "",
      "الكلية / الجامعة / الجهة": a.faculty || "",
      "المحافظة / المدينة": a.city || "",
      "فئة التذكرة": a.category || "General",
      "حالة القبول":
        a.approvalStatus === "accepted"
          ? "مقبول"
          : a.approvalStatus === "pending"
          ? "قيد المراجعة"
          : "مرفوض",
      "حالة التذكرة": a.hasTicket ? `تم الإصدار (${a.ticketNumber || ""})` : "لم تصدر بعد",
      "رقم التذكرة": a.ticketNumber || "",
      "تاريخ التسجيل": a.registeredAt ? new Date(a.registeredAt).toLocaleString("ar-EG") : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف المسجلين");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="NextGen_Attendees_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: XLSX
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="NextGen_Attendees_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

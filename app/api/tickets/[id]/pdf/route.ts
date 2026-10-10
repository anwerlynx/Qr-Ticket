import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getTicketById, getTicketByCredential } from "@/lib/db";
import { formatQRPayload, generateQRCodeBuffer } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let ticket = await getTicketById(id);
    if (!ticket) {
      ticket = await getTicketByCredential(id);
    }

    if (!ticket) {
      return NextResponse.json({ success: false, error: "التذكرة غير موجودة" }, { status: 404 });
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrPayload = formatQRPayload(ticket.secureCredential, hostUrl);
    const qrBuffer = await generateQRCodeBuffer(qrPayload, { width: 280 });

    // Create PDF in memory
    const doc = new PDFDocument({
      size: "A5",
      layout: "portrait",
      margins: { top: 30, bottom: 30, left: 30, right: 30 },
      info: {
        Title: `Ticket ${ticket.ticketNumber} - ${ticket.attendeeName}`,
        Author: "Next Gen Ticketing System",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);
    });

    // Dark Obsidian Theme Styling
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#0d1117");

    // Header Badge
    doc.rect(30, 30, doc.page.width - 60, 60).fillAndStroke("#161b22", "#30363d");
    doc.fontSize(16).fillColor("#ffffff").text(ticket.eventName || "NEXT GEN 2026", 45, 42, { align: "center" });
    doc.fontSize(9).fillColor("#00ffc2").text(ticket.eventTagline || "#NEXT_GEN_WORLD", 45, 65, { align: "center" });

    // Attendee Info Card
    doc.rect(30, 105, doc.page.width - 60, 105).fillAndStroke("#161b22", "#30363d");
    doc.fontSize(10).fillColor("#8b949e").text("ATTENDEE NAME / اسم المشترك", 45, 115);
    doc.fontSize(14).fillColor("#ffffff").text(ticket.attendeeName, 45, 130);

    doc.fontSize(9).fillColor("#8b949e").text("CATEGORY / الفئة", 45, 155);
    doc.fontSize(11).fillColor("#58a6ff").text(ticket.category || "General", 45, 168);

    doc.fontSize(9).fillColor("#8b949e").text("TICKET NO", doc.page.width - 150, 155);
    doc.fontSize(13).fillColor("#00ffc2").text(ticket.ticketNumber, doc.page.width - 150, 168);

    // QR Code Image in Center
    const qrX = (doc.page.width - 160) / 2;
    doc.rect(qrX - 10, 220, 180, 180).fillAndStroke("#ffffff", "#00ffc2");
    doc.image(qrBuffer, qrX, 230, { width: 160, height: 160 });

    // Event Date & Venue Card
    doc.rect(30, 420, doc.page.width - 60, 75).fillAndStroke("#161b22", "#30363d");
    doc.fontSize(9).fillColor("#8b949e").text("DATE & TIME", 45, 430);
    doc.fontSize(10).fillColor("#ffffff").text(`${ticket.eventDate} - ${ticket.eventTime || "05:00 PM"}`, 45, 443);

    doc.fontSize(9).fillColor("#8b949e").text("VENUE / المكان", 45, 460);
    doc.fontSize(9).fillColor("#e6edf3").text(ticket.venueName || "Next Gen Arena", 45, 473);

    // Footer instructions
    doc.fontSize(7).fillColor("#6e7681").text("Scan this QR code at the gate entrance. Single entry per ticket.", 30, 510, {
      align: "center",
      width: doc.page.width - 60,
    });

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Ticket-${ticket.ticketNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

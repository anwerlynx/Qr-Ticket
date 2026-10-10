import { getTicketById } from "@/lib/db";
import { formatQRPayload, generateQRCodeBuffer } from "@/lib/qr";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await getTicketById(id);

    if (!ticket) {
      return new Response("Ticket not found", { status: 404 });
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payload = formatQRPayload(ticket.secureCredential, hostUrl);
    const buffer = await generateQRCodeBuffer(payload, { width: 320 });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    return new Response("Error generating QR: " + err.message, { status: 500 });
  }
}

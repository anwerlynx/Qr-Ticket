import { NextResponse } from "next/server";
import { getEventSettings, saveEventSettings } from "@/lib/event-settings";
import { updateAllTicketsWithEventSettings } from "@/lib/db";

export async function GET() {
  try {
    const settings = await getEventSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await saveEventSettings(body);
    let updatedTicketsCount = 0;
    if (body.syncExistingTickets !== false) {
      updatedTicketsCount = await updateAllTicketsWithEventSettings(updated);
    }
    return NextResponse.json({
      success: true,
      settings: updated,
      updatedTicketsCount,
      message: "تم حفظ وتطبيق قالب التذكرة العام لجميع التذاكر والإيميلات بنجاح!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

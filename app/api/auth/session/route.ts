import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authenticated = await isAuthenticatedAdmin(request);
    return NextResponse.json({
      success: true,
      authenticated,
      user: authenticated ? { role: "admin", name: "System Administrator" } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { markDmNotificationsAsRead } from "@/lib/notificationStore";
import { verifySessionToken } from "@/lib/authStore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("ayeraa_token")?.value;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    const body = await req.json().catch(() => ({}));
    let userId = body.userId;
    if (token) {
      const payload = verifySessionToken(token);
      if (payload) userId = payload.id;
    }

    const dmRoomId = body.dmRoomId;
    if (!userId || !dmRoomId) {
      return NextResponse.json(
        { success: false, error: "userId and dmRoomId are required" },
        { status: 400 }
      );
    }

    await markDmNotificationsAsRead(userId, dmRoomId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui notifikasi";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

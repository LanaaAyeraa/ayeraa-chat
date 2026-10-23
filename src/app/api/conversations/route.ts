import { NextRequest, NextResponse } from "next/server";
import { getUserDmConversations } from "@/lib/notificationStore";
import { verifySessionToken } from "@/lib/authStore";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("ayeraa_token")?.value;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    let userId = req.nextUrl.searchParams.get("userId") || undefined;
    if (token) {
      const payload = verifySessionToken(token);
      if (payload) userId = payload.id;
    }

    if (!userId) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const conversations = await getUserDmConversations(userId);
    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat percakapan";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

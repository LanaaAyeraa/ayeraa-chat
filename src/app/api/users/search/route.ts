import { NextRequest, NextResponse } from "next/server";
import { searchUsers, verifySessionToken } from "@/lib/authStore";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";

    // Optional: detect current user from token to exclude from search results
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("ayeraa_token")?.value;
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    let currentUserId: string | undefined;
    if (token) {
      const payload = verifySessionToken(token);
      if (payload) currentUserId = payload.id;
    }

    const users = await searchUsers(q, currentUserId);

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mencari pengguna.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

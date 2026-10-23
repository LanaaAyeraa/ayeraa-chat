import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getUserById } from "@/lib/authStore";

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

    if (!token) {
      return NextResponse.json({ success: false, error: "Tidak ada token sesi." }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Sesi kedaluwarsa atau tidak valid." }, { status: 401 });
    }

    const user = getUserById(payload.id);

    return NextResponse.json({
      success: true,
      user: user || {
        id: payload.id,
        username: payload.username,
        name: payload.name,
        avatar: payload.avatar,
        provider: payload.provider,
        createdAt: payload.iat * 1000,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  // Logout route: clears cookie
  const response = NextResponse.json({ success: true, message: "Berhasil logout." });
  response.cookies.delete("ayeraa_token");
  return response;
}

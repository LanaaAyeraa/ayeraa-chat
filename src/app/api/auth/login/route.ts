import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/authStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, credentialToken } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const result = loginUser(username, password, credentialToken);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      credentialToken: result.credentialToken,
      user: result.user,
    });

    if (result.token) {
      response.cookies.set("ayeraa_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

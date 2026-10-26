import { NextRequest, NextResponse } from "next/server";
import { loginGuest } from "@/lib/authStore";

export async function POST(req: NextRequest) {
  try {
    let name: string | undefined;
    let avatar: string | undefined;

    try {
      const body = await req.json();
      if (body) {
        name = body.name;
        avatar = body.avatar;
      }
    } catch {
      // Body is optional for guest login
    }

    const result = await loginGuest(name, avatar);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || "Gagal masuk sebagai tamu." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    });

    if (result.token) {
      response.cookies.set("ayeraa_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days for guests
        path: "/",
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

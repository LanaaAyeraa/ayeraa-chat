import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/authStore";

const RESET_SECRET = process.env.AYERAA_RESET_SECRET || "ayeraa_reset_secret_2026";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, newPassword, resetSecret } = body;

    // Require reset secret to prevent unauthorized resets
    if (resetSecret !== RESET_SECRET) {
      return NextResponse.json(
        { success: false, error: "Kode reset tidak valid." },
        { status: 403 }
      );
    }

    if (!username || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Username dan password baru wajib diisi." },
        { status: 400 }
      );
    }

    const result = await resetPassword(username, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
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

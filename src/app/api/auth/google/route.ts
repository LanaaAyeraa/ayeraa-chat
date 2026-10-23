import { NextRequest, NextResponse } from "next/server";
import { handleGoogleAuth } from "@/lib/authStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, profile } = body;

    let googleProfile: { email: string; name: string; picture?: string; sub: string } | null = null;

    if (credential && typeof credential === "string") {
      // Decode JWT payload without external library
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
          const data = JSON.parse(payloadJson);
          if (data.email) {
            googleProfile = {
              email: data.email,
              name: data.name || data.email.split("@")[0],
              picture: data.picture,
              sub: data.sub || data.email,
            };
          }
        }
      } catch {
        // Fallback if parsing fails
      }
    }

    if (!googleProfile && profile && profile.email) {
      googleProfile = {
        email: profile.email,
        name: profile.name || profile.email.split("@")[0],
        picture: profile.picture,
        sub: profile.sub || profile.email,
      };
    }

    if (!googleProfile) {
      return NextResponse.json(
        { success: false, error: "Data Google Sign-In tidak valid." },
        { status: 400 }
      );
    }

    const result = handleGoogleAuth(googleProfile);

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

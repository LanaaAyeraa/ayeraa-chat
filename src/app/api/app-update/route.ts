import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 5,
    versionName: "1.0.4",
    downloadUrl: "https://github.com/LanaaAyeraa/ayeraa-chat/releases/download/v1.0.0/AyeraaChat.apk",
    changelog: "Pembaruan v1.0.4: Ikon aplikasi resmi baru Ayera, branding visual modern, dan optimasi performa.",
    releaseDate: "2026-10-27",
  });
}

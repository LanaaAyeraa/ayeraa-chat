import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 2,
    versionName: "1.0.1",
    downloadUrl: "https://github.com/LanaaAyeraa/ayeraa-chat/releases/download/v1.0.0/AyeraaChat.apk",
    changelog: "Pembaruan koneksi global server, penambahan auto-update in-app, dan optimasi performa.",
    releaseDate: "2026-10-23",
  });
}

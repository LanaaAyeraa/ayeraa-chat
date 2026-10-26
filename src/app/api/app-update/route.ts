import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 4,
    versionName: "1.0.3",
    downloadUrl: "https://github.com/LanaaAyeraa/ayeraa-chat/releases/download/v1.0.0/AyeraaChat.apk",
    changelog: "Pembaruan v1.0.3: Sinkronisasi real-time instan Web & Android APK, perbaikan multi-container serverless Vercel, live online counter, dan kompatibilitas tab pesan.",
    releaseDate: "2026-10-26",
  });
}

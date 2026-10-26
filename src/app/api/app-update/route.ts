import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    versionCode: 3,
    versionName: "1.0.2",
    downloadUrl: "https://github.com/LanaaAyeraa/ayeraa-chat/releases/download/v1.0.0/AyeraaChat.apk",
    changelog: "Pembaruan v1.0.2: Dukungan Akun Tamu (Guest Mode), in-app auto updater, dan perbaikan koneksi global.",
    releaseDate: "2026-10-26",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/roomStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    let userId = "";

    try {
      const rawText = await req.text();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          userId = parsed.userId || "";
        } catch {
          userId = rawText.trim();
        }
      }
    } catch {
      // fallback
    }

    if (userId) {
      leaveRoom(roomId, userId);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

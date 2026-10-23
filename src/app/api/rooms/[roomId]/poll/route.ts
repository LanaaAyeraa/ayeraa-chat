import { NextRequest, NextResponse } from "next/server";
import { getDelta } from "@/lib/roomStore";

interface RouteProps {
  params: Promise<{ roomId: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteProps
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(req.url);
    const since = parseInt(searchParams.get("since") || "0", 10);
    const userId = searchParams.get("userId") || undefined;
    const userName = searchParams.get("userName") || undefined;
    const userAvatar = searchParams.get("userAvatar") || undefined;

    const delta = getDelta(roomId, since, userId, userName, userAvatar);

    if (!delta) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      roomId,
      roomName: delta.roomName,
      messages: delta.messages,
      participants: delta.participants,
      typingUsers: delta.typingUsers,
      serverTime: delta.serverTime,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

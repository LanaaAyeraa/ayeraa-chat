import { NextRequest, NextResponse } from "next/server";
import { getDelta, syncRoomFromStorage } from "@/lib/roomStore";

declare global {
  // eslint-disable-next-line no-var
  var __ayeraaLastSyncPerRoom: Map<string, number> | undefined;
}

const lastSyncMap: Map<string, number> =
  globalThis.__ayeraaLastSyncPerRoom ?? new Map<string, number>();
globalThis.__ayeraaLastSyncPerRoom = lastSyncMap;

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

    // Multi-container serverless sync:
    // Sync on cold start (since === 0) OR if > 1200ms has elapsed since this container last synced
    const now = Date.now();
    const lastSync = lastSyncMap.get(roomId) || 0;
    if (since === 0 || now - lastSync > 1200) {
      await syncRoomFromStorage(roomId);
      lastSyncMap.set(roomId, now);
    }

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

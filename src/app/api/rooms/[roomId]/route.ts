import { NextRequest, NextResponse } from "next/server";
import { getRoom, getOrCreateRoom } from "@/lib/roomStore";

interface RouteProps {
  params: Promise<{ roomId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteProps
) {
  try {
    const { roomId } = await params;
    const room = getRoom(roomId) || getOrCreateRoom(roomId);

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
        messages: room.messages,
        participants: Object.values(room.participants),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

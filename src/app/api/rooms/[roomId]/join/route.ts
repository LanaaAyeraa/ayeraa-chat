import { NextRequest, NextResponse } from "next/server";
import { registerParticipant, syncRoomFromStorage } from "@/lib/roomStore";

interface RouteProps {
  params: Promise<{ roomId: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteProps
) {
  try {
    const { roomId } = await params;
    const body = await req.json();

    if (!body.id || !body.name) {
      return NextResponse.json(
        { success: false, error: "Participant id and name are required" },
        { status: 400 }
      );
    }

    // Restore chat history from persistent storage if newly spin-up or fresh join
    await syncRoomFromStorage(roomId);

    const room = registerParticipant(roomId, {
      id: body.id,
      name: body.name.trim(),
      avatar: body.avatar || "☕",
    });

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
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

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRoom, listPublicRooms } from "@/lib/roomStore";
import { generateRoomSlug } from "@/lib/utils";

export async function GET() {
  try {
    const rooms = listPublicRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawId = body.id || generateRoomSlug();
    const cleanId = rawId
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: "Invalid room identifier" },
        { status: 400 }
      );
    }

    const roomName = body.name?.trim() || cleanId;
    const room = getOrCreateRoom(cleanId, roomName, body.hostId || "host");

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

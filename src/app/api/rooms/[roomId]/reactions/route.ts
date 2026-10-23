import { NextRequest, NextResponse } from "next/server";
import { toggleReaction } from "@/lib/roomStore";

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

    if (!body.messageId || !body.userId || !body.emoji) {
      return NextResponse.json(
        { success: false, error: "Missing required reaction fields" },
        { status: 400 }
      );
    }

    const updatedMessage = await toggleReaction(
      roomId,
      body.messageId,
      body.userId,
      body.emoji,
      body.currentReactions
    );

    if (!updatedMessage) {
      return NextResponse.json(
        { success: false, error: "Message or room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

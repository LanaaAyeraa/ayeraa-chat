import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@/lib/roomStore";

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

    if (!body.senderId || !body.senderName || !body.content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required message fields" },
        { status: 400 }
      );
    }

    const message = addMessage(roomId, {
      senderId: body.senderId,
      senderName: body.senderName,
      senderAvatar: body.senderAvatar || "☕",
      content: body.content,
      replyTo: body.replyTo,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

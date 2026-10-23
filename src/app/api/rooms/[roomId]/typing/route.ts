import { NextRequest, NextResponse } from "next/server";
import { setTypingStatus } from "@/lib/roomStore";

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

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    setTypingStatus(roomId, body.userId, Boolean(body.isTyping));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

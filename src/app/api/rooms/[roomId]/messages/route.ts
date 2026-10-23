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

    const hasContent = Boolean(body.content?.trim());
    const hasAttachment = Boolean(body.attachment?.url && body.attachment?.name);

    if (!body.senderId || !body.senderName || (!hasContent && !hasAttachment)) {
      return NextResponse.json(
        { success: false, error: "Missing required message fields (must include text content or attachment)" },
        { status: 400 }
      );
    }

    if (body.attachment && typeof body.attachment.url === "string" && body.attachment.url.length > 5500000) {
      return NextResponse.json(
        { success: false, error: "Attachment exceeds max payload limit (4.5MB)" },
        { status: 413 }
      );
    }

    const message = addMessage(roomId, {
      senderId: body.senderId,
      senderName: body.senderName,
      senderAvatar: body.senderAvatar || "☕",
      content: body.content || "",
      attachment: hasAttachment ? {
        url: body.attachment.url,
        name: String(body.attachment.name).slice(0, 255),
        size: Number(body.attachment.size) || 0,
        type: String(body.attachment.type || "application/octet-stream"),
        isImage: Boolean(body.attachment.isImage),
      } : undefined,
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

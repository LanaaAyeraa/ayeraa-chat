import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrCreateRoom,
  getRoom,
  registerParticipant,
  addMessage,
  toggleReaction,
  setTypingStatus,
  getDelta,
  listPublicRooms,
  _resetStoreForTesting,
} from "../lib/roomStore";

describe("HavenChat Room Store (Penta-Engine Business Logic)", () => {
  beforeEach(() => {
    _resetStoreForTesting();
  });

  it("should create a room with system keeper message", () => {
    const room = getOrCreateRoom("serene-hearth-101", "Serene Hearth");
    expect(room).toBeDefined();
    expect(room.id).toBe("serene-hearth-101");
    expect(room.name).toBe("Serene Hearth");
    expect(room.messages.length).toBe(1);
    expect(room.messages[0].isSystem).toBe(true);
    expect(room.messages[0].senderName).toBe("Haven Keeper");
  });

  it("should register participant and record join event", () => {
    const roomId = "warm-solaris-202";
    const room = registerParticipant(roomId, {
      id: "user-1",
      name: "Alice",
      avatar: "🦊",
    });

    expect(room.participants["user-1"]).toBeDefined();
    expect(room.participants["user-1"].name).toBe("Alice");
    expect(room.participants["user-1"].avatar).toBe("🦊");

    // Room should now have keeper message + join message
    expect(room.messages.length).toBe(2);
    expect(room.messages[1].isSystem).toBe(true);
    expect(room.messages[1].content).toContain("Alice joined");
  });

  it("should post a message with optional reply targeting", () => {
    const roomId = "cozy-parlor-303";
    registerParticipant(roomId, { id: "user-1", name: "Alice", avatar: "🦊" });
    registerParticipant(roomId, { id: "user-2", name: "Bob", avatar: "🦉" });

    const msg1 = addMessage(roomId, {
      senderId: "user-1",
      senderName: "Alice",
      senderAvatar: "🦊",
      content: "Hello everyone in the haven!",
    });

    expect(msg1.id).toBeDefined();
    expect(msg1.content).toBe("Hello everyone in the haven!");
    expect(msg1.reactions).toEqual({});

    // Bob replies to Alice
    const msg2 = addMessage(roomId, {
      senderId: "user-2",
      senderName: "Bob",
      senderAvatar: "🦉",
      content: "Greetings Alice! Glad to be here.",
      replyTo: {
        id: msg1.id,
        senderName: msg1.senderName,
        content: msg1.content,
      },
    });

    expect(msg2.replyTo).toBeDefined();
    expect(msg2.replyTo?.id).toBe(msg1.id);
    expect(msg2.replyTo?.senderName).toBe("Alice");
  });

  it("should toggle message reactions properly", () => {
    const roomId = "amber-sanctuary-404";
    registerParticipant(roomId, { id: "user-1", name: "Alice", avatar: "🦊" });

    const msg = addMessage(roomId, {
      senderId: "user-1",
      senderName: "Alice",
      senderAvatar: "🦊",
      content: "A beautiful sunset today.",
    });

    // Add reaction
    const reacted = toggleReaction(roomId, msg.id, "user-2", "❤️");
    expect(reacted).toBeDefined();
    expect(reacted?.reactions["❤️"]).toContain("user-2");

    // Toggle off
    const unreacted = toggleReaction(roomId, msg.id, "user-2", "❤️");
    expect(unreacted?.reactions["❤️"]).toBeUndefined();
  });

  it("should update typing status and return in delta sync", () => {
    const roomId = "silent-alcove-505";
    registerParticipant(roomId, { id: "user-1", name: "Alice", avatar: "🦊" });
    registerParticipant(roomId, { id: "user-2", name: "Bob", avatar: "🦉" });

    setTypingStatus(roomId, "user-1", true);

    // Delta seen by Bob (currentUserId = 'user-2')
    const deltaForBob = getDelta(roomId, 0, "user-2");
    expect(deltaForBob).toBeDefined();
    expect(deltaForBob?.typingUsers).toContain("Alice");

    // Delta seen by Alice (she should not see herself typing)
    const deltaForAlice = getDelta(roomId, 0, "user-1");
    expect(deltaForAlice?.typingUsers).not.toContain("Alice");
  });

  it("should list active rooms and participant counts", () => {
    getOrCreateRoom("room-alpha", "Alpha");
    getOrCreateRoom("room-beta", "Beta");
    registerParticipant("room-alpha", { id: "u1", name: "One", avatar: "☕" });

    const rooms = listPublicRooms();
    expect(rooms.length).toBeGreaterThanOrEqual(2);
    const alpha = rooms.find((r) => r.id === "room-alpha");
    expect(alpha?.participantsCount).toBe(1);
  });

  it("should self-heal participant presence on getDelta call", () => {
    const roomId = "heal-sanctum-999";
    // getDelta with a new user that hasn't called join yet on this instance
    const delta = getDelta(roomId, 0, "ghost-user", "Ghost Walker", "👻");
    expect(delta).toBeDefined();
    expect(delta?.participants.length).toBe(1);
    expect(delta?.participants[0].id).toBe("ghost-user");
    expect(delta?.participants[0].name).toBe("Ghost Walker");
    expect(delta?.participants[0].isOnline).toBe(true);
  });
});

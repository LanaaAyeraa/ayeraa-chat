import json
import time
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "https://haven-chat-eight.vercel.app"

def request_json(url, method="GET", data=None, headers=None, cookies=None):
    if headers is None:
        headers = {}
    if data is not None:
        payload = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        payload = None

    if cookies:
        headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())

    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            body = res.read().decode("utf-8")
            status = res.status
            res_headers = dict(res.getheaders())
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            return status, parsed, res_headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        res_headers = dict(e.headers)
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed, res_headers
    except Exception as e:
        return 0, str(e), {}

def run_tests():
    print("=" * 65)
    print("🚀 AYERAA CHAT: DM NOTIFICATION & WHATSAPP/IG INBOX HARDTEST")
    print(f"Target Endpoint: {BASE_URL}")
    print("=" * 65)

    ts = int(time.time() * 1000) % 1000000
    user_a_name = f"NotifAlice_{ts}"
    user_a_username = f"nalice_{ts}"
    user_b_name = f"NotifBob_{ts}"
    user_b_username = f"nbob_{ts}"
    password = "SecurePassword123!"

    passed = 0
    total = 8

    # 1. Register User A (Alice)
    print("\n[TEST 1/8] Registering Sender (Alice)...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"name": user_a_name, "username": user_a_username, "password": password, "avatar": "🌸"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    user_a = res["user"]
    token_a = res["token"]
    print(f" PASS: Registered {user_a['username']} (ID: {user_a['id']})")
    passed += 1

    # 2. Register User B (Bob)
    print("\n[TEST 2/8] Registering Recipient (Bob)...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"name": user_b_name, "username": user_b_username, "password": password, "avatar": "🐺"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    user_b = res["user"]
    token_b = res["token"]
    print(f" PASS: Registered {user_b['username']} (ID: {user_b['id']})")
    passed += 1

    # 3. Construct Deterministic DM Slug & Join
    print("\n[TEST 3/8] Preparing DM Room...")
    sorted_ids = sorted([user_a["id"].strip(), user_b["id"].strip()])
    dm_room_id = f"dm--{sorted_ids[0]}--{sorted_ids[1]}".lower()

    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/join",
        method="POST",
        data={"id": user_a["id"], "name": user_a["name"], "avatar": user_a["avatar"]}
    )
    assert st == 200 and res.get("success")
    print(f" PASS: DM Room active: {dm_room_id}")
    passed += 1

    # 4. User A sends DM to User B
    print("\n[TEST 4/8] User A sending DM message to User B...")
    dm_content = f"Hey Bob, did you see the new update? Time: {ts}"
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/messages",
        method="POST",
        data={
            "senderId": user_a["id"],
            "senderName": user_a["name"],
            "senderAvatar": user_a["avatar"],
            "content": dm_content,
        }
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    print(f" PASS: Message sent in DM room.")
    passed += 1

    # 5. Check Bob's Notifications endpoint
    print("\n[TEST 5/8] Checking GET /api/notifications for Bob...")
    time.sleep(1.0) # buffer for storage
    st, res, _ = request_json(
        f"{BASE_URL}/api/notifications?userId={user_b['id']}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    notifs = res.get("notifications", [])
    assert len(notifs) >= 1, f"Expected at least 1 notification, got: {notifs}"
    target_notif = next((n for n in notifs if n["dmRoomId"] == dm_room_id), None)
    assert target_notif is not None, f"Notification for room {dm_room_id} not found: {notifs}"
    assert target_notif["senderId"] == user_a["id"]
    assert target_notif["content"] == dm_content
    print(f" PASS: Notification delivered to Bob! From: {target_notif['senderName']}, Content: '{target_notif['content']}'")
    passed += 1

    # 6. Check Bob's Instagram / WhatsApp Style Conversations list
    print("\n[TEST 6/8] Checking GET /api/conversations for Bob (WA/IG Inbox list)...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/conversations?userId={user_b['id']}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    convs = res.get("conversations", [])
    target_conv = next((c for c in convs if c["roomId"] == dm_room_id), None)
    assert target_conv is not None, f"Conversation {dm_room_id} not found in Bob's inbox: {convs}"
    assert target_conv["peerId"] == user_a["id"], f"Peer ID mismatch: {target_conv}"
    assert target_conv["unreadCount"] >= 1, f"Unread count should be >= 1, got: {target_conv['unreadCount']}"
    assert target_conv["lastMessageSnippet"] == dm_content, f"Snippet mismatch: {target_conv}"
    print(f" PASS: Conversation thread verified in Bob's inbox: Peer '{target_conv['peerName']}', Unread: {target_conv['unreadCount']}, Snippet: '{target_conv['lastMessageSnippet']}'")
    passed += 1

    # 7. Check Alice's Conversation list (should show 'Anda: ...')
    print("\n[TEST 7/8] Checking GET /api/conversations for Alice (Sender view)...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/conversations?userId={user_a['id']}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    alice_convs = res.get("conversations", [])
    target_a_conv = next((c for c in alice_convs if c["roomId"] == dm_room_id), None)
    assert target_a_conv is not None, f"Conversation {dm_room_id} not found in Alice's inbox: {alice_convs}"
    assert target_a_conv["peerId"] == user_b["id"], f"Peer ID mismatch: {target_a_conv}"
    assert target_a_conv["lastMessageSnippet"].startswith("Anda:"), f"Expected snippet to start with 'Anda:', got: {target_a_conv['lastMessageSnippet']}"
    print(f" PASS: Sender inbox verified: Peer '{target_a_conv['peerName']}', Snippet: '{target_a_conv['lastMessageSnippet']}'")
    passed += 1

    # 8. Mark Notification as Read (Bob opens the DM room)
    print("\n[TEST 8/8] Bob reads the DM (POST /api/notifications/read)...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/notifications/read",
        method="POST",
        headers={"Authorization": f"Bearer {token_b}"},
        data={"userId": user_b["id"], "dmRoomId": dm_room_id}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"

    # Verify notifications cleared
    st, res, _ = request_json(
        f"{BASE_URL}/api/notifications?userId={user_b['id']}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert st == 200 and res.get("success")
    assert res.get("unreadCount", 0) == 0, f"Expected 0 unread notifications, got: {res}"
    print(" PASS: Notifications marked as read cleanly. Unread count = 0.")
    passed += 1

    print("\n" + "=" * 65)
    print(f"🎉 ALL {passed}/{total} DM NOTIFICATION & INBOX HARDTESTS PASSED 100%!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()

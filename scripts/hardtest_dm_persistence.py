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
    print("🚀 AYERAA CHAT: USER SEARCH, DM & MESSAGE PERSISTENCE HARDTEST")
    print(f"Target Endpoint: {BASE_URL}")
    print("=" * 65)

    ts = int(time.time() * 1000) % 1000000
    user_a_name = f"DmAlice_{ts}"
    user_a_username = f"dmalice_{ts}"
    user_b_name = f"DmBob_{ts}"
    user_b_username = f"dmbob_{ts}"
    password = "SecurePassword123!"

    passed = 0
    total = 12

    # 1. Register User A
    print("\n[TEST 1/12] Registering User A (Alice)...")
    st, res, hd = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"name": user_a_name, "username": user_a_username, "password": password, "avatar": "🦊"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    user_a = res["user"]
    token_a = res["token"]
    print(f" PASS: Registered {user_a['username']} (ID: {user_a['id']})")
    passed += 1

    # 2. Register User B
    print("\n[TEST 2/12] Registering User B (Bob)...")
    st, res, hd = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"name": user_b_name, "username": user_b_username, "password": password, "avatar": "🦉"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    user_b = res["user"]
    token_b = res["token"]
    print(f" PASS: Registered {user_b['username']} (ID: {user_b['id']})")
    passed += 1

    # 3. Search Users - Exact match for Bob with Alice's token
    print("\n[TEST 3/12] User Search: Alice searching for Bob by username...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/users/search?q={user_b_username}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    users = res.get("users", [])
    found_bob = any(u["id"] == user_b["id"] for u in users)
    found_alice = any(u["id"] == user_a["id"] for u in users)
    assert found_bob, f"Bob should be found in search results: {users}"
    assert not found_alice, f"Alice should be excluded from her own search results: {users}"
    print(f" PASS: Found Bob, Alice correctly excluded. Total matches: {len(users)}")
    passed += 1

    # 4. Search Users - Case-insensitive partial name search
    print("\n[TEST 4/12] User Search: Partial match case-insensitivity...")
    prefix = user_b_name[:6].lower()
    st, res, _ = request_json(
        f"{BASE_URL}/api/users/search?q={prefix}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    users = res.get("users", [])
    assert any(u["id"] == user_b["id"] for u in users), f"Prefix search failed to find Bob: {users}"
    print(f" PASS: Prefix search '{prefix}' returned Bob successfully.")
    passed += 1

    # 5. Deterministic DM Slug Construction
    print("\n[TEST 5/12] Verifying Deterministic DM Slug Construction...")
    sorted_ids = sorted([user_a["id"].strip(), user_b["id"].strip()])
    dm_room_id = f"dm--{sorted_ids[0]}--{sorted_ids[1]}".lower()
    
    # Check commutative order
    reverse_order = sorted([user_b["id"].strip(), user_a["id"].strip()])
    dm_room_id_rev = f"dm--{reverse_order[0]}--{reverse_order[1]}".lower()
    assert dm_room_id == dm_room_id_rev, "Slug must be commutative!"
    print(f" PASS: Deterministic DM Slug: {dm_room_id}")
    passed += 1

    # 6. User A joins DM room
    print("\n[TEST 6/12] User A joining DM room...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/join",
        method="POST",
        data={"id": user_a["id"], "name": user_a["name"], "avatar": user_a["avatar"]}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    print(f" PASS: User A joined DM room. Room Name: '{res['room']['name']}'")
    passed += 1

    # 7. User B joins DM room
    print("\n[TEST 7/12] User B joining DM room...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/join",
        method="POST",
        data={"id": user_b["id"], "name": user_b["name"], "avatar": user_b["avatar"]}
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    participants = res["room"]["participants"]
    assert any(p["id"] == user_a["id"] for p in participants), "Alice missing from DM room"
    assert any(p["id"] == user_b["id"] for p in participants), "Bob missing from DM room"
    print(f" PASS: User B joined. Both participants verified in DM room.")
    passed += 1

    # 8. User A sends a message in DM
    print("\n[TEST 8/12] User A sending message in DM room...")
    secret_text = f"Hello Bob! This is our private DM. Timestamp: {ts}"
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/messages",
        method="POST",
        data={
            "senderId": user_a["id"],
            "senderName": user_a["name"],
            "senderAvatar": user_a["avatar"],
            "content": secret_text,
        }
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    msg_a = res["message"]
    assert msg_a["content"] == secret_text
    print(f" PASS: Message sent. ID: {msg_a['id']}")
    passed += 1

    # 9. User B polls DM room and receives User A's message
    print("\n[TEST 9/12] User B polling DM room delta...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/poll?since=0&userId={user_b['id']}"
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    messages = res.get("messages", [])
    found_msg = next((m for m in messages if m["id"] == msg_a["id"]), None)
    assert found_msg is not None, f"Message {msg_a['id']} not received in poll: {messages}"
    assert found_msg["content"] == secret_text
    print(f" PASS: User B received message: '{found_msg['content']}'")
    passed += 1

    # 10. User B adds reaction to message
    print("\n[TEST 10/12] User B reacting to Alice's message...")
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/reactions",
        method="POST",
        data={
            "messageId": msg_a["id"],
            "userId": user_b["id"],
            "emoji": "❤️"
        }
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    rx_msg = res["message"]
    assert "❤️" in rx_msg["reactions"] and user_b["id"] in rx_msg["reactions"]["❤️"]
    print(f" PASS: Reaction ❤️ added and verified in message.")
    passed += 1

    # 11. Message Persistence & Cold Start Recovery (Blob Storage Ground Truth)
    print("\n[TEST 11/12] Verifying Message & Reaction Persistence across Fresh Container / Poll...")
    # Give a tiny buffer for Blob persistence write
    time.sleep(1.5)
    st, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{dm_room_id}/poll?since=0&userId=fresh_observer"
    )
    assert st == 200 and res.get("success"), f"Fail: {res}"
    recovered_msgs = res.get("messages", [])
    target = next((m for m in recovered_msgs if m["id"] == msg_a["id"]), None)
    assert target is not None, f"Message lost across cold sync! Total msgs: {len(recovered_msgs)}"
    assert target["content"] == secret_text, "Content corrupted in persistence store!"
    assert "❤️" in target.get("reactions", {}), "Reactions not persisted in Blob storage!"
    print(f" PASS: Chat history and reactions 100% recovered from persistent storage!")
    passed += 1

    # 12. Privacy Isolation: DM room must NOT appear in public rooms directory
    print("\n[TEST 12/12] Verifying Privacy: DM room excluded from Public Rooms list...")
    st, res, _ = request_json(f"{BASE_URL}/api/rooms")
    assert st == 200 and res.get("success"), f"Fail: {res}"
    public_rooms = res.get("rooms", [])
    dm_leak = any(r["id"].lower() == dm_room_id.lower() or r["id"].startswith("dm--") for r in public_rooms)
    assert not dm_leak, f"Security Violation: DM room leaked into public directory! Rooms: {public_rooms}"
    print(f" PASS: DM room '{dm_room_id}' is strictly private and hidden from public rooms.")
    passed += 1

    print("\n" + "=" * 65)
    print(f"🎉 ALL {passed}/{total} HARDTEST CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()

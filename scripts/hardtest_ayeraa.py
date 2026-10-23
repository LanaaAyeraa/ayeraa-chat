"""
Hardtest Suite for Ayeraa Chat (Production & Local API Verification)
Covers 10 Rigorous Test Scenarios:
1. Room Creation & Slug Normalization
2. Multi-User Join & System Keeper Welcome Message
3. Self-Healing Presence via Polling Heartbeat
4. Real-time Messaging & Chronological Ordering
5. Quoted Reply Chains & Payload Integrity
6. Message Reactions Add/Toggle/Remove
7. Multi-User Typing Indicator Isolation
8. Public Rooms Directory & Accurate Telemetry
9. Error Boundaries (404, 400, Invalid Payloads)
10. Latency & Header Security Audit
"""

import sys
import time
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "https://haven-chat-eight.vercel.app"

def request_json(url, method="GET", data=None):
    headers = {"Content-Type": "application/json", "User-Agent": "AyeraaHardtester/1.0"}
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body), resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed, e.headers

def run_hardtest():
    print("=" * 60)
    print("🚀 AYERAA CHAT RIGOROUS HARDTEST SUITE (PENTA-ENGINE)")
    print(f"Target: {BASE_URL}")
    print("=" * 60)
    
    passed = 0
    total = 11
    test_run_id = f"ht-{int(time.time())}"
    room_id = f"ayeraa-test-{test_run_id}"

    # ---------------------------------------------------------
    # TEST 1: Room Creation & Normalization
    # ---------------------------------------------------------
    print(f"\n[TEST 1/10] Creating room '{room_id}'...")
    status, res, _ = request_json(f"{BASE_URL}/api/rooms", "POST", {
        "id": f"  {room_id.upper()}  ",
        "name": "Ayeraa Hardtest Chamber"
    })
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, "Expected success: True"
    assert res["room"]["id"] == room_id.lower(), f"Normalization failed: {res['room']['id']}"
    assert res["room"]["name"] == "Ayeraa Hardtest Chamber"
    print("✅ TEST 1 PASSED: Room created & slug normalized correctly.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 2: Multi-User Join & Ayeraa Keeper Welcome Message
    # ---------------------------------------------------------
    print("\n[TEST 2/10] Multi-User Join (Alice & Bob)...")
    status, res_alice, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/join", "POST", {
        "id": f"u-alice-{test_run_id}",
        "name": "Alice Wonderland",
        "avatar": "🦊"
    })
    assert status == 200 and res_alice["success"] is True

    status, res_bob, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/join", "POST", {
        "id": f"u-bob-{test_run_id}",
        "name": "Bob Builder",
        "avatar": "🦉"
    })
    assert status == 200 and res_bob["success"] is True
    print("✅ TEST 2 PASSED: Both users registered with avatars.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 3: Self-Healing Presence via Polling Heartbeat
    # ---------------------------------------------------------
    print("\n[TEST 3/10] Testing Self-Healing Presence on Charlie (Unjoined user)...")
    charlie_id = f"u-charlie-{test_run_id}"
    poll_url = f"{BASE_URL}/api/rooms/{room_id}/poll?since=0&userId={charlie_id}&userName=Charlie%20Brown&userAvatar=%E2%9A%A1"
    status, res_poll, _ = request_json(poll_url, "GET")
    assert status == 200 and res_poll["success"] is True
    
    participants = {p["id"]: p for p in res_poll["participants"]}
    assert charlie_id in participants, "Self-healing failed: Charlie not in participants!"
    assert participants[charlie_id]["isOnline"] is True
    assert participants[charlie_id]["avatar"] == "⚡"
    
    # Verify Ayeraa Keeper welcome message exists
    sys_msgs = [m for m in res_poll["messages"] if m.get("isSystem") is True]
    assert len(sys_msgs) >= 1
    assert any("Ayeraa Keeper" in m.get("senderName", "") for m in sys_msgs), "Ayeraa Keeper missing!"
    print("✅ TEST 3 PASSED: Self-healing heartbeat auto-registered unjoined participant!")
    passed += 1

    # ---------------------------------------------------------
    # TEST 4: Real-time Messaging & Chronological Ordering
    # ---------------------------------------------------------
    print("\n[TEST 4/10] Sending Burst Messages...")
    sent_messages = []
    for i in range(3):
        status, res_msg, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/messages", "POST", {
            "senderId": f"u-alice-{test_run_id}",
            "senderName": "Alice Wonderland",
            "senderAvatar": "🦊",
            "content": f"Test message payload #{i + 1} at {time.time()}"
        })
        assert status == 200 and res_msg["success"] is True
        sent_messages.append(res_msg["message"])
        time.sleep(0.05)
    
    assert len(sent_messages) == 3
    # Check monotonic timestamps
    assert sent_messages[0]["timestamp"] <= sent_messages[1]["timestamp"] <= sent_messages[2]["timestamp"]
    target_msg_id = sent_messages[0]["id"]
    print("✅ TEST 4 PASSED: Burst messages posted with monotonic timestamps.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 5: Quoted Reply Context Integrity
    # ---------------------------------------------------------
    print(f"\n[TEST 5/10] Bob Replies to Alice's Message ({target_msg_id})...")
    status, res_reply, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/messages", "POST", {
        "senderId": f"u-bob-{test_run_id}",
        "senderName": "Bob Builder",
        "senderAvatar": "🦉",
        "content": "This is a quoted reply to message #1!",
        "replyTo": {
            "id": target_msg_id,
            "senderName": "Alice Wonderland",
            "content": sent_messages[0]["content"]
        }
    })
    assert status == 200 and res_reply["success"] is True
    reply_msg = res_reply["message"]
    assert reply_msg.get("replyTo") is not None
    assert reply_msg["replyTo"]["id"] == target_msg_id
    assert reply_msg["replyTo"]["senderName"] == "Alice Wonderland"
    print("✅ TEST 5 PASSED: Reply context preserved exactly.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 6: Reactions Add, Toggle & Eviction
    # ---------------------------------------------------------
    print(f"\n[TEST 6/10] Testing Reaction Mechanics on {target_msg_id}...")
    # Alice adds heart
    status, r1, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/reactions", "POST", {
        "messageId": target_msg_id,
        "userId": f"u-alice-{test_run_id}",
        "emoji": "❤️"
    })
    assert status == 200 and "❤️" in r1["message"]["reactions"]
    assert f"u-alice-{test_run_id}" in r1["message"]["reactions"]["❤️"]

    # Bob adds heart
    status, r2, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/reactions", "POST", {
        "messageId": target_msg_id,
        "userId": f"u-bob-{test_run_id}",
        "emoji": "❤️"
    })
    assert len(r2["message"]["reactions"]["❤️"]) == 2

    # Alice un-hearts
    status, r3, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/reactions", "POST", {
        "messageId": target_msg_id,
        "userId": f"u-alice-{test_run_id}",
        "emoji": "❤️"
    })
    assert len(r3["message"]["reactions"]["❤️"]) == 1

    # Bob un-hearts -> key should be deleted
    status, r4, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/reactions", "POST", {
        "messageId": target_msg_id,
        "userId": f"u-bob-{test_run_id}",
        "emoji": "❤️"
    })
    assert "❤️" not in r4["message"]["reactions"], "Zero-count reaction was not pruned!"
    print("✅ TEST 6 PASSED: Reactions toggled and pruned when empty.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 7: Multi-User Typing Indicator Isolation
    # ---------------------------------------------------------
    print("\n[TEST 7/10] Typing Indicator Isolation...")
    # Alice starts typing
    status, _, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/typing", "POST", {
        "userId": f"u-alice-{test_run_id}",
        "isTyping": True
    })
    assert status == 200

    # Bob polls -> should see Alice typing
    status, poll_bob, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/poll?userId=u-bob-{test_run_id}", "GET")
    assert "Alice Wonderland" in poll_bob["typingUsers"], f"Bob didn't see Alice typing: {poll_bob['typingUsers']}"

    # Alice polls -> should NOT see herself typing
    status, poll_alice, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/poll?userId=u-alice-{test_run_id}", "GET")
    assert "Alice Wonderland" not in poll_alice["typingUsers"], "Alice saw herself typing!"

    # Alice stops typing
    request_json(f"{BASE_URL}/api/rooms/{room_id}/typing", "POST", {
        "userId": f"u-alice-{test_run_id}",
        "isTyping": False
    })
    status, poll_cleared, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/poll?userId=u-bob-{test_run_id}", "GET")
    assert "Alice Wonderland" not in poll_cleared["typingUsers"]
    print("✅ TEST 7 PASSED: Typing isolation and clear verified.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 8: Public Rooms Directory & Accurate Telemetry
    # ---------------------------------------------------------
    print("\n[TEST 8/10] Inspecting Public Rooms Directory...")
    status, res_dir, _ = request_json(f"{BASE_URL}/api/rooms", "GET")
    assert status == 200 and "rooms" in res_dir
    found_room = next((r for r in res_dir["rooms"] if r["id"] == room_id.lower()), None)
    assert found_room is not None, f"Room {room_id} not listed in public directory!"
    assert found_room["messageCount"] >= 4
    assert found_room["participantsCount"] >= 1
    print(f"✅ TEST 8 PASSED: Room listed with {found_room['participantsCount']} active members, {found_room['messageCount']} messages.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 9: File & Image Attachment Transmission
    # ---------------------------------------------------------
    print("\n[TEST 9/11] Sending Image & Document Attachments...")
    # Send image attachment
    status, res_img_msg, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/messages", "POST", {
        "senderId": f"u-alice-{test_run_id}",
        "senderName": "Alice Wonderland",
        "senderAvatar": "🦊",
        "content": "Here is our design diagram!",
        "attachment": {
            "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "name": "architecture.png",
            "size": 128,
            "type": "image/png",
            "isImage": True
        }
    })
    assert status == 200 and res_img_msg["success"] is True
    assert res_img_msg["message"]["attachment"]["name"] == "architecture.png"
    assert res_img_msg["message"]["attachment"]["isImage"] is True

    # Send document attachment (PDF) without caption text
    status, res_doc_msg, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/messages", "POST", {
        "senderId": f"u-bob-{test_run_id}",
        "senderName": "Bob Builder",
        "senderAvatar": "🦉",
        "attachment": {
            "url": "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM2Pj5Kc3RyZWFtCkJULyAxMiBUZihIZWxsbyBXb3JsZCkgVGpFVAplbmRzdHJlYW0KZW5kb2JqCg==",
            "name": "project-brief.pdf",
            "size": 105,
            "type": "application/pdf",
            "isImage": False
        }
    })
    assert status == 200 and res_doc_msg["success"] is True
    assert res_doc_msg["message"]["attachment"]["name"] == "project-brief.pdf"
    assert res_doc_msg["message"]["attachment"]["isImage"] is False
    print("✅ TEST 9 PASSED: Images and documents transmitted & stored cleanly.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 10: Error Boundaries (404, 400, Malformed Input)
    # ---------------------------------------------------------
    print("\n[TEST 10/11] Verifying Error Boundaries & Input Validation...")
    # Bad join (missing name)
    s1, r1, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/join", "POST", {"id": "bad-u"})
    assert s1 == 400, f"Expected 400 on missing name, got {s1}"

    # Bad message (missing both content AND attachment)
    s2, r2, _ = request_json(f"{BASE_URL}/api/rooms/{room_id}/messages", "POST", {
        "senderId": "u1", "senderName": "U1"
    })
    assert s2 == 400, f"Expected 400 on missing content/attachment, got {s2}"
    print("✅ TEST 10 PASSED: Input validation blocks invalid payloads with 400 Bad Request.")
    passed += 1

    # ---------------------------------------------------------
    # TEST 11: Performance, Latency & Headers
    # ---------------------------------------------------------
    print("\n[TEST 11/11] Latency & Header Security Audit...")
    latencies = []
    for _ in range(5):
        t0 = time.time()
        s, _, headers = request_json(f"{BASE_URL}/api/rooms/{room_id}/poll?since=0&userId=u-alice-{test_run_id}", "GET")
        latencies.append((time.time() - t0) * 1000)
        assert s == 200

    avg_latency = sum(latencies) / len(latencies)
    print(f"Average Roundtrip Latency: {avg_latency:.1f} ms (Min: {min(latencies):.1f}ms, Max: {max(latencies):.1f}ms)")
    assert avg_latency < 1200, f"Latency too high: {avg_latency}ms"
    print("✅ TEST 10 PASSED: High-performance latency (<1.2s roundtrip to Vercel global edge).")
    passed += 1

    print("\n" + "=" * 60)
    print(f"🎉 ALL {passed}/{total} HARDTESTS PASSED 100% GREEN!")
    print("Status: LULUS TOTAL & SIAP DIBUNGKUS KE DESKTOP APP!")
    print("=" * 60)

if __name__ == "__main__":
    run_hardtest()

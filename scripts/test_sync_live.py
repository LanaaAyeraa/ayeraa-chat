import urllib.request
import urllib.parse
import json
import time

BASE_URL = "https://haven-chat-eight.vercel.app"

def test_sync():
    print("[1/5] Testing App Update Endpoint...")
    req = urllib.request.Request(f"{BASE_URL}/api/app-update")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Update data:", data)
        assert data["versionCode"] == 4, f"Expected versionCode 4, got {data['versionCode']}"
        assert data["versionName"] == "1.0.3", f"Expected versionName 1.0.3, got {data['versionName']}"
    print("[OK] App update endpoint verified (v1.0.3)!")

    print("\n[2/5] Testing Public Rooms Seeding...")
    req = urllib.request.Request(f"{BASE_URL}/api/rooms")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        rooms = data.get("rooms", [])
        room_ids = [r["id"] for r in rooms]
        print(f"Discovered rooms: {room_ids}")
        assert "general" in room_ids, "general room missing"
        assert "santai" in room_ids, "santai room missing"
    print("[OK] Public rooms verified!")

    print("\n[3/5] Testing Participant Join (User A Web & User B Android)...")
    user_a = {"id": f"web-user-{int(time.time())}", "name": "Budi Web", "avatar": "W"}
    user_b = {"id": f"apk-user-{int(time.time())}", "name": "Lana Android", "avatar": "A"}

    # User A joins
    req_a = urllib.request.Request(
        f"{BASE_URL}/api/rooms/general/join",
        data=json.dumps(user_a).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_a) as resp:
        res = json.loads(resp.read().decode())
        assert res.get("success") is True

    # User B joins
    req_b = urllib.request.Request(
        f"{BASE_URL}/api/rooms/general/join",
        data=json.dumps(user_b).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_b) as resp:
        res = json.loads(resp.read().decode())
        assert res.get("success") is True
    print("[OK] Both users joined successfully!")

    print("\n[4/5] Testing Web -> Android Real-time Sync...")
    # Initial poll by Android (User B) to establish timestamp
    params_b0 = urllib.parse.urlencode({"since": "0", "userId": user_b["id"], "userName": user_b["name"], "userAvatar": user_b["avatar"]})
    poll_url = f"{BASE_URL}/api/rooms/general/poll?{params_b0}"
    with urllib.request.urlopen(poll_url) as resp:
        poll_res = json.loads(resp.read().decode())
        last_ts = poll_res.get("serverTime", int(time.time() * 1000))

    # User A sends message from Web
    msg_content = f"Halo dari Web di masa {int(time.time())}"
    send_payload = {
        "senderId": user_a["id"],
        "senderName": user_a["name"],
        "senderAvatar": user_a["avatar"],
        "content": msg_content
    }
    req_send = urllib.request.Request(
        f"{BASE_URL}/api/rooms/general/messages",
        data=json.dumps(send_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_send) as resp:
        send_res = json.loads(resp.read().decode())
        assert send_res.get("success") is True
        sent_msg = send_res.get("message")
        print(f"Sent by Web: {sent_msg['content']} (id: {sent_msg['id']})")

    # Android polls with since=last_ts (Simulating subsequent poll hitting potentially another container)
    time.sleep(1.5)
    params_b_delta = urllib.parse.urlencode({"since": str(last_ts), "userId": user_b["id"], "userName": user_b["name"], "userAvatar": user_b["avatar"]})
    poll_delta_url = f"{BASE_URL}/api/rooms/general/poll?{params_b_delta}"
    with urllib.request.urlopen(poll_delta_url) as resp:
        delta_res = json.loads(resp.read().decode())
        received_msgs = [m for m in delta_res.get("messages", []) if m["id"] == sent_msg["id"]]
        print(f"Android received delta messages: {[m['content'] for m in delta_res.get('messages', [])]}")
        assert len(received_msgs) > 0, "Web message not received by Android poll!"
        print("[OK] Web -> Android real-time sync verified!")

    print("\n[5/5] Testing Android -> Web Real-time Sync...")
    # User B sends message from Android APK
    apk_msg_content = f"Halo dari APK Android di masa {int(time.time())}"
    apk_payload = {
        "senderId": user_b["id"],
        "senderName": user_b["name"],
        "senderAvatar": user_b["avatar"],
        "content": apk_msg_content
    }
    req_apk_send = urllib.request.Request(
        f"{BASE_URL}/api/rooms/general/messages",
        data=json.dumps(apk_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_apk_send) as resp:
        apk_send_res = json.loads(resp.read().decode())
        assert apk_send_res.get("success") is True
        apk_sent = apk_send_res.get("message")
        print(f"Sent by Android APK: {apk_sent['content']} (id: {apk_sent['id']})")

    # Web polls with since=last_ts
    time.sleep(1.5)
    params_a_delta = urllib.parse.urlencode({"since": str(last_ts), "userId": user_a["id"], "userName": user_a["name"], "userAvatar": user_a["avatar"]})
    web_poll_url = f"{BASE_URL}/api/rooms/general/poll?{params_a_delta}"
    with urllib.request.urlopen(web_poll_url) as resp:
        web_delta = json.loads(resp.read().decode())
        found_apk_msg = [m for m in web_delta.get("messages", []) if m["id"] == apk_sent["id"]]
        assert len(found_apk_msg) > 0, "Android message not received by Web poll!"
        print("[OK] Android -> Web real-time sync verified!")

    print("\n==========================================")
    print("ALL TESTS PASSED! 100% BIDIRECTIONAL SYNC GREEN!")
    print("==========================================")

if __name__ == "__main__":
    test_sync()

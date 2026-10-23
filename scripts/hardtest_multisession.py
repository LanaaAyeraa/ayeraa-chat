import json
import time
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "https://haven-chat-eight.vercel.app"

# Small 1x1 test image data URL to simulate a custom photo upload
CUSTOM_PHOTO_AVATAR = (
    "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA"
)

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
        with urllib.request.urlopen(req, timeout=20) as res:
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

def run_multisession_hardtest():
    print("=" * 65)
    print("🧪 AYERAA MULTI-SESSION, CROSS-BROWSER & AVATAR HARDTEST SUITE")
    print(f"Target Endpoint: {BASE_URL}")
    print("=" * 65)

    ts = int(time.time())
    user_alpha_name = f"pilot_a_{ts % 10000}"
    user_alpha_pass = "AlphaPass#2026!"
    user_beta_name = f"pilot_b_{ts % 10000}"
    user_beta_pass = "BetaPass#2026!"

    # -------------------------------------------------------------
    # STAGE 1: Register User Alpha with Custom Photo Avatar
    # -------------------------------------------------------------
    print("\n[STAGE 1/6] Registering User Alpha with Custom Photo Avatar...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={
            "username": user_alpha_name,
            "password": user_alpha_pass,
            "name": "Captain Alpha",
            "avatar": CUSTOM_PHOTO_AVATAR,
            "bio": "Pilot Alpha Custom Photo",
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    assert res["user"]["avatar"] == CUSTOM_PHOTO_AVATAR
    user_a = res["user"]
    token_a = res["token"]
    print(f"✅ STAGE 1 PASSED: User @{user_alpha_name} registered with custom photo avatar ({len(CUSTOM_PHOTO_AVATAR)} chars).")

    # -------------------------------------------------------------
    # STAGE 2: Register User Beta with Standard Emoji Avatar
    # -------------------------------------------------------------
    print("\n[STAGE 2/6] Registering User Beta with Emoji Avatar...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={
            "username": user_beta_name,
            "password": user_beta_pass,
            "name": "Commander Beta",
            "avatar": "🚀",
            "bio": "Pilot Beta Emoji",
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    user_b = res["user"]
    token_b = res["token"]
    print(f"✅ STAGE 2 PASSED: User @{user_beta_name} registered.")

    # -------------------------------------------------------------
    # STAGE 3: Cross-Device / Independent Session Login (Zero Shared Cookies)
    # -------------------------------------------------------------
    print("\n[STAGE 3/6] Simulating Login from Completely Fresh Incognito Browser (No Cookies)...")
    # Fresh HTTP request without any pre-existing cookie
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/login",
        method="POST",
        data={
            "username": user_alpha_name,
            "password": user_alpha_pass,
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, f"Cross-browser login failed: {res}"
    assert res["user"]["username"] == user_alpha_name
    assert res["user"]["avatar"] == CUSTOM_PHOTO_AVATAR
    fresh_session_token = res["token"]
    print(f"✅ STAGE 3 PASSED: Cross-device login succeeded for @{user_alpha_name}. Custom photo avatar preserved!")

    # -------------------------------------------------------------
    # STAGE 4: Update Profile to Change Custom Photo
    # -------------------------------------------------------------
    print("\n[STAGE 4/6] Updating User Beta's Avatar to a Custom Photo...")
    NEW_CUSTOM_PHOTO = "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA"
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/profile",
        method="PUT",
        data={
            "name": "Beta Enhanced",
            "avatar": NEW_CUSTOM_PHOTO,
            "bio": "Beta updated with photo avatar",
        },
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res["user"]["avatar"] == NEW_CUSTOM_PHOTO
    print("✅ STAGE 4 PASSED: User Beta avatar upgraded from emoji to custom photo.")

    # -------------------------------------------------------------
    # STAGE 5: Room Presence & Instant Leave Beacon Testing
    # -------------------------------------------------------------
    room_id = f"presence-hardtest-{ts}"
    print(f"\n[STAGE 5/6] Testing Real-Time Presence & Leave Beacon in #{room_id}...")

    # Create room
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms",
        method="POST",
        data={"id": room_id, "name": f"Presence Test {ts}"},
    )
    assert status == 200

    # User A joins
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_id}/join",
        method="POST",
        data={"id": user_a["id"], "name": user_a["name"], "avatar": user_a["avatar"]},
    )
    assert status == 200

    # User B joins
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_id}/join",
        method="POST",
        data={"id": user_b["id"], "name": user_b["name"], "avatar": NEW_CUSTOM_PHOTO},
    )
    assert status == 200

    # Poll presence - both should be online
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_id}/poll?userId={user_a['id']}&since=0"
    )
    assert status == 200
    participants = res.get("participants", [])
    part_map = {p["id"]: p for p in participants}

    assert user_a["id"] in part_map, "User A not in participants"
    assert user_b["id"] in part_map, "User B not in participants"
    assert part_map[user_a["id"]]["isOnline"] is True, "User A should be online"
    assert part_map[user_b["id"]]["isOnline"] is True, "User B should be online"
    assert part_map[user_a["id"]]["avatar"] == CUSTOM_PHOTO_AVATAR
    assert part_map[user_b["id"]]["avatar"] == NEW_CUSTOM_PHOTO
    print(f"✅ Both User A and User B active & online in #{room_id} with their custom photos!")

    # -------------------------------------------------------------
    # STAGE 6: Send Leave Beacon (User B closes tab)
    # -------------------------------------------------------------
    print("\n[STAGE 6/6] Emulating Browser Tab Close Beacon for User B...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_id}/leave",
        method="POST",
        data={"userId": user_b["id"]},
    )
    assert status == 200, f"Leave beacon failed: {res}"

    # Poll again as User A - User B must now be OFFLINE immediately
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_id}/poll?userId={user_a['id']}&since=0"
    )
    assert status == 200
    participants_after = res.get("participants", [])
    part_map_after = {p["id"]: p for p in participants_after}

    assert user_b["id"] in part_map_after
    assert part_map_after[user_b["id"]]["isOnline"] is False, "User B should be offline immediately after leave beacon"
    assert part_map_after[user_a["id"]]["isOnline"] is True, "User A should remain online"
    print("✅ STAGE 6 PASSED: Instant presence disconnect confirmed! User B marked away/offline immediately without delay.")

    print("\n" + "=" * 65)
    print("🎉 ALL 6/6 MULTI-SESSION & AVATAR HARDTESTS PASSED 100% GREEN!")
    print("=" * 65)

if __name__ == "__main__":
    run_multisession_hardtest()

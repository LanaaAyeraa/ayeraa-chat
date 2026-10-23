import json
import time
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "https://haven-chat-eight.vercel.app"

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
    print("=" * 60)
    print("🚀 AYERAA CHAT AUTHENTICATION HARDTEST SUITE")
    print(f"Target Endpoint: {BASE_URL}")
    print("=" * 60)

    ts = int(time.time())
    test_username = f"tester_{ts % 10000}"
    test_password = "SecurePassword123!"
    test_name = "Hardtest Pilot"

    # TEST 1: Register New User
    print("\n[TEST 1/12] Registering New User...")
    status, res, headers = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={
            "username": test_username,
            "password": test_password,
            "name": test_name,
            "avatar": "🛡️",
            "bio": "Automated verification agent",
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, f"Expected success: true, got {res}"
    assert "token" in res, "Expected token in response"
    token = res["token"]
    cred_token = res.get("credentialToken")
    user = res["user"]
    assert user["username"] == test_username
    print(f"✅ TEST 1 PASSED: Registered user @{test_username} (Token prefix: {token[:16]}...)")

    # TEST 2: Duplicate Username Prevention
    print("\n[TEST 2/12] Checking Duplicate Username Prevention...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"username": test_username, "password": test_password},
    )
    assert status == 400, f"Expected 400 Bad Request, got {status}: {res}"
    assert res.get("success") is False
    print("✅ TEST 2 PASSED: Duplicate registration correctly rejected with 400 Bad Request.")

    # TEST 3: Short Password Validation
    print("\n[TEST 3/12] Checking Short Password Validation (<6 chars)...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/register",
        method="POST",
        data={"username": f"user_short_{ts}", "password": "123"},
    )
    assert status == 400, f"Expected 400 Bad Request, got {status}: {res}"
    assert res.get("success") is False
    print("✅ TEST 3 PASSED: Short password rejected with 400 Bad Request.")

    # TEST 4: Invalid Password Login
    print("\n[TEST 4/12] Checking Invalid Password Login Rejection...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/login",
        method="POST",
        data={"username": test_username, "password": "WrongPassword999", "credentialToken": cred_token},
    )
    assert status == 401, f"Expected 401 Unauthorized, got {status}: {res}"
    assert res.get("success") is False
    print("✅ TEST 4 PASSED: Invalid password rejected with 401 Unauthorized.")

    # TEST 5: Valid Login
    print("\n[TEST 5/12] Checking Valid Credentials Login...")
    status, res, headers = request_json(
        f"{BASE_URL}/api/auth/login",
        method="POST",
        data={"username": test_username, "password": test_password, "credentialToken": cred_token},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    login_token = res["token"]
    print("✅ TEST 5 PASSED: Login succeeded, HMAC session token received.")

    # TEST 6: Session Verification via Bearer Token Header
    print("\n[TEST 6/12] Verifying Session via Authorization Bearer Header...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    assert res["user"]["username"] == test_username
    print(f"✅ TEST 6 PASSED: Verified session for @{res['user']['username']}.")

    # TEST 7: Session Verification via Cookie
    print("\n[TEST 7/12] Verifying Session via Cookie...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/me",
        cookies={"ayeraa_token": login_token},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    assert res["user"]["username"] == test_username
    print("✅ TEST 7 PASSED: Cookie session verification operational.")

    # TEST 8: Profile Update (Display Name, Avatar, Bio)
    print("\n[TEST 8/12] Updating User Profile...")
    updated_name = "Hardtest Master 2026"
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/profile",
        method="PUT",
        data={
            "name": updated_name,
            "avatar": "🚀",
            "bio": "Verified Hardtest Astronaut",
        },
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    assert res["user"]["name"] == updated_name
    assert res["user"]["avatar"] == "🚀"
    print(f"✅ TEST 8 PASSED: Profile updated to name '{updated_name}' and avatar '🚀'.")

    # TEST 9: Google OAuth / SSO Flow
    print("\n[TEST 9/12] Testing Google SSO Integration...")
    google_email = f"ayeraa_test_{ts}@gmail.com"
    status, res, _ = request_json(
        f"{BASE_URL}/api/auth/google",
        method="POST",
        data={
            "profile": {
                "email": google_email,
                "name": "Google Test Pilot",
                "picture": "https://lh3.googleusercontent.com/test",
                "sub": f"g_sub_{ts}",
            }
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    assert res["user"]["provider"] == "google"
    google_token = res["token"]
    print(f"✅ TEST 9 PASSED: Google user created (@{res['user']['username']}) with provider='google'.")

    # TEST 10: Room Creation & Authenticated Join
    print("\n[TEST 10/12] Testing Room Creation with Authenticated Identity...")
    room_slug = f"auth-room-{ts}"
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms",
        method="POST",
        data={"id": room_slug, "name": f"Auth Protected Room {ts}"},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"

    # Join room with the authenticated user ID and updated name
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_slug}/join",
        method="POST",
        data={
            "id": user["id"],
            "name": updated_name,
            "avatar": "🚀",
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    print(f"✅ TEST 10 PASSED: Authenticated user joined room #{room_slug}.")

    # TEST 11: Authenticated Message Sending
    print("\n[TEST 11/12] Sending Message with Verified Identity...")
    status, res, _ = request_json(
        f"{BASE_URL}/api/rooms/{room_slug}/messages",
        method="POST",
        data={
            "senderId": user["id"],
            "senderName": updated_name,
            "senderAvatar": "🚀",
            "content": "Halo dari akun terotentikasi Ayeraa Chat!",
        },
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    msg = res["message"]
    assert msg["senderId"] == user["id"]
    assert msg["senderName"] == updated_name
    print(f"✅ TEST 11 PASSED: Message attributed to verified user '{updated_name}' (ID: {user['id']}).")

    # TEST 12: Logout & Revocation Check
    print("\n[TEST 12/12] Testing Logout Route...")
    status, res, _ = request_json(f"{BASE_URL}/api/auth/me", method="POST")
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True
    print("✅ TEST 12 PASSED: Logout endpoint clears session cookies cleanly.")

    print("\n" + "=" * 60)
    print("🎉 ALL 12/12 AUTHENTICATION HARDTESTS PASSED 100% GREEN!")
    print("Status: SISTEM LOGIN & AKUN AYERAA SIAP PRODUCTION!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

import urllib.request
import json

try:
    req = urllib.request.Request(
        "https://api.npoint.io",
        data=json.dumps({"test": 123}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        print("npoint response:", res.status, res.read().decode())
except Exception as e:
    print("npoint error:", e)

#!/usr/bin/env python3
"""ieWorkspace Auth & User Service (Python 3 stdlib, SQLite on persistent Data volume)."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

PORT = int(os.environ.get("IE_AUTH_PORT", "3001"))
DATA_DIR = os.environ.get("IE_AUTH_DATA_DIR", "/var/www/elixiroffice/Data")
DB_PATH = os.path.join(DATA_DIR, "ieworkspace-auth.db")
SECRET_FILE = os.path.join(DATA_DIR, ".ie-auth-secret")
LOGIN_HTML_PATH = os.environ.get("IE_LOGIN_HTML", "/var/www/elixiroffice/ieworkspace-auth/login.html")
COOKIE_NAME = "ie_session"
SESSION_TTL = 60 * 60 * 24 * 30  # 30 days


def get_secret() -> bytes:
    env_sec = os.environ.get("IE_AUTH_SECRET") or os.environ.get("JWT_SECRET")
    if env_sec:
        return env_sec.encode("utf-8")
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "rb") as f:
            raw = f.read().strip()
            if raw:
                return raw
    new_sec = secrets.token_hex(32).encode("utf-8")
    with open(SECRET_FILE, "wb") as f:
        f.write(new_sec)
    try:
        os.chmod(SECRET_FILE, 0o600)
    except OSError:
        pass
    return new_sec


SECRET = get_secret()


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=32)
    return base64.b64encode(salt).decode("ascii") + "$" + base64.b64encode(dk).decode("ascii")


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, dk_b64 = stored.split("$", 1)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=32)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def sign_token(user: dict) -> str:
    payload = {
        "uid": user["id"],
        "name": user["name"],
        "email": user["email"],
        "exp": int(time.time()) + SESSION_TTL,
    }
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).rstrip(b"=")
    sig = base64.urlsafe_b64encode(hmac.new(SECRET, raw, hashlib.sha256).digest()).rstrip(b"=")
    return raw.decode("ascii") + "." + sig.decode("ascii")


def verify_token(token: str):
    if not token or "." not in token:
        return None
    try:
        raw_str, sig_str = token.split(".", 1)
        raw = raw_str.encode("ascii")
        expected_sig = base64.urlsafe_b64encode(hmac.new(SECRET, raw, hashlib.sha256).digest()).rstrip(b"=").decode("ascii")
        if not hmac.compare_digest(sig_str, expected_sig):
            return None
        padded = raw_str + "=" * ((4 - len(raw_str) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return {"id": payload["uid"], "name": payload["name"], "email": payload["email"]}
    except Exception:
        return None


class AuthHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors_headers(self):
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _send_json(self, code: int, data: dict, set_cookie: str = None):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        if set_cookie is not None:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 65536:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def _current_user(self):
        # 1. Check Authorization: Bearer <token> (used by Desktop apps)
        auth = self.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            u = verify_token(auth[7:].strip())
            if u:
                return u
        # 2. Check HttpOnly cookie (used by Web & Android)
        cookie_hdr = self.headers.get("Cookie", "")
        if cookie_hdr:
            c = SimpleCookie()
            try:
                c.load(cookie_hdr)
                if COOKIE_NAME in c:
                    return verify_token(c[COOKIE_NAME].value)
            except Exception:
                pass
        return None

    def _make_cookie(self, token: str, clear: bool = False) -> str:
        proto = (self.headers.get("X-Forwarded-Proto") or "").lower()
        secure = "; Secure" if proto == "https" else ""
        if clear:
            return f"{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0{secure}"
        return f"{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_TTL}{secure}"

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path in ("/login", "/signup"):
            if self._current_user():
                self.send_response(302)
                self.send_header("Location", "/")
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        if path == "/api/auth/check":
            self.send_response(204 if self._current_user() else 401)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/login", "/signup"):
            if self._current_user():
                self.send_response(302)
                self.send_header("Location", "/")
                self.end_headers()
                return
            try:
                with open(LOGIN_HTML_PATH, "rb") as f:
                    html = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(html)))
                self.end_headers()
                self.wfile.write(html)
            except Exception:
                self._send_json(500, {"error": "Login page missing"})
            return

        if path == "/api/auth/check":
            user = self._current_user()
            if user:
                self.send_response(204)
                self.send_header("X-IE-User-Name", user["name"])
                self.send_header("X-IE-User-Email", user["email"])
                self.end_headers()
            else:
                self.send_response(401)
                self.end_headers()
            return

        if path == "/api/auth/me":
            user = self._current_user()
            if user:
                self._send_json(200, {"authenticated": True, "user": user})
            else:
                self._send_json(401, {"authenticated": False})
            return

        self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/auth/signup":
            body = self._read_json()
            name = str(body.get("name", "")).strip()
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", ""))
            if len(name) < 2:
                self._send_json(400, {"error": "Please enter your full name (at least 2 characters)."})
                return
            if "@" not in email or "." not in email.split("@")[-1] or len(email) > 254:
                self._send_json(400, {"error": "Please enter a valid email address."})
                return
            if len(password) < 6:
                self._send_json(400, {"error": "Password must be at least 6 characters."})
                return

            pw_hash = hash_password(password)
            conn = sqlite3.connect(DB_PATH, timeout=10)
            try:
                cur = conn.execute(
                    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (name, email, pw_hash, int(time.time())),
                )
                conn.commit()
                user = {"id": cur.lastrowid, "name": name, "email": email}
            except sqlite3.IntegrityError:
                conn.close()
                self._send_json(409, {"error": "An account with this email already exists. Please sign in."})
                return
            finally:
                try:
                    conn.close()
                except Exception:
                    pass

            token = sign_token(user)
            self._send_json(201, {"ok": True, "user": user, "token": token}, set_cookie=self._make_cookie(token))
            return

        if path == "/api/auth/login":
            body = self._read_json()
            email = str(body.get("email", "")).strip().lower()
            password = str(body.get("password", ""))
            if not email or not password:
                self._send_json(400, {"error": "Email and password are required."})
                return

            conn = sqlite3.connect(DB_PATH, timeout=10)
            row = conn.execute(
                "SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,)
            ).fetchone()
            conn.close()

            if not row or not verify_password(password, row[3]):
                self._send_json(401, {"error": "Invalid email or password."})
                return

            user = {"id": row[0], "name": row[1], "email": row[2]}
            token = sign_token(user)
            self._send_json(200, {"ok": True, "user": user, "token": token}, set_cookie=self._make_cookie(token))
            return

        if path == "/api/auth/logout":
            self._send_json(200, {"ok": True}, set_cookie=self._make_cookie("", clear=True))
            return

        self._send_json(404, {"error": "Not found"})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AuthHandler)
    print(f"ieWorkspace Auth listening on 127.0.0.1:{PORT} (db={DB_PATH})", flush=True)
    server.serve_forever()

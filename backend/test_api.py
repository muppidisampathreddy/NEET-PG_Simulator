"""Run: python test_api.py  (uses a throwaway DB and upload dir)"""
import os
import tempfile

tmp = tempfile.mkdtemp()
os.environ |= {"DB_PATH": f"{tmp}/t.db", "UPLOAD_DIR": f"{tmp}/up"}

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

c = TestClient(app)
H = {"X-Admin-Key": "secret"}
PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 32

# seeded demo exam is published and hides answers
demo = c.get("/api/exams").json()[0]
q0 = c.get(f"/api/exams/{demo['id']}").json()["questions"][0]
assert "answer" not in q0 and "explanation" not in q0

# first run: no password yet, so admin routes are locked until setup
assert c.get("/api/admin/setup").json() == {"needed": True}
assert c.get("/api/admin/exams", headers=H).status_code == 401
assert c.post("/api/admin/setup", json={"password": "short"}).status_code == 422
assert c.post("/api/admin/setup", json={"password": "secret"}).status_code == 204
assert c.get("/api/admin/setup").json() == {"needed": False}
assert c.post("/api/admin/setup", json={"password": "hijack"}).status_code == 409  # can't be reset by a stranger

# admin routes need the password
assert c.get("/api/admin/exams").status_code == 401
assert c.get("/api/admin/exams", headers={"X-Admin-Key": "wrong"}).status_code == 401

# create exam with 2 sections
e = c.post("/api/admin/exams", headers=H, json={"title": "Test", "sections": 2, "minutes_per_section": 1}).json()
assert c.get(f"/api/exams/{e['id']}").status_code == 404  # unpublished is hidden

form = {"section": "0", "text": "Q1?", "options": ["a", "b", "c", "d"], "answer": "2", "explanation": "because"}
q1 = c.post(f"/api/admin/exams/{e['id']}/questions", headers=H, data=form, files={"image": ("x.png", PNG, "image/png")}).json()
assert q1["image"].endswith(".png") and c.get(q1["image"]).status_code == 200
assert c.post(f"/api/admin/exams/{e['id']}/questions", headers=H, data=form, files={"image": ("x.svg", b"<svg/>", "image/svg+xml")}).status_code == 400
assert c.post(f"/api/admin/exams/{e['id']}/questions", headers=H, data=form | {"options": ["a", "b", "c"]}).status_code == 400

# can't publish while section B is empty
assert c.patch(f"/api/admin/exams/{e['id']}", headers=H, json={"published": True}).status_code == 400
q2 = c.post(f"/api/admin/exams/{e['id']}/questions", headers=H, data=form | {"section": "1", "answer": "0"}).json()
assert c.patch(f"/api/admin/exams/{e['id']}", headers=H, json={"published": True}).json()["published"]

# edit: remove image deletes the file
img = q1["image"]
c.put(f"/api/admin/questions/{q1['id']}", headers=H, data=form | {"remove_image": "true"})
assert c.get(img).status_code == 404

# student submits: q1 right (+4), q2 wrong (-1)
r = c.post(f"/api/exams/{e['id']}/submit", json={"answers": {q1["id"]: 2, q2["id"]: 3}}).json()
assert (r["right"], r["wrong"], r["score"], r["max_score"]) == (1, 1, 3, 8), r
assert r["key"][str(q1["id"])]["explanation"] == "because"

# concurrent requests (the admin page fires several at once) must not 500
from concurrent.futures import ThreadPoolExecutor  # noqa: E402

with ThreadPoolExecutor(16) as pool:
    codes = list(pool.map(lambda i: c.get("/api/admin/exams" if i % 2 else f"/api/admin/exams/{e['id']}", headers=H).status_code, range(64)))
assert set(codes) == {200}, codes

assert c.delete(f"/api/admin/exams/{e['id']}", headers=H).status_code == 204
print("all API checks passed")

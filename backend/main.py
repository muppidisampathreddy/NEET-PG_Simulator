"""NEET-PG simulator API: admins build and publish exams, students take them."""
import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE = Path(__file__).parent
DB_PATH = Path(os.environ.get("DB_PATH", BASE / "data.db"))
UPLOADS = Path(os.environ.get("UPLOAD_DIR", BASE / "uploads"))
MAX_IMAGE = 5 * 1024 * 1024
UPLOADS.mkdir(parents=True, exist_ok=True)

SCHEMA = """
create table if not exists exams (
  id integer primary key,
  title text not null,
  sections integer not null default 5,
  minutes_per_section integer not null default 4,
  marks_correct integer not null default 4,
  marks_wrong integer not null default 1,
  published integer not null default 0
);
create table if not exists questions (
  id integer primary key,
  exam_id integer not null references exams(id) on delete cascade,
  section integer not null,
  text text not null,
  image text,
  options text not null,
  answer integer not null,
  explanation text not null default ''
);
create table if not exists settings (key text primary key, value text not null);
"""


def connect() -> sqlite3.Connection:
    # FastAPI may open the connection (in the dependency) and use it (in the endpoint) on different
    # threadpool threads. Safe here: each request gets its own connection, used by one request at a time.
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("pragma foreign_keys = on")
    return con


def db():
    con = connect()
    try:
        yield con
        con.commit()
    finally:
        con.close()


def seed(con: sqlite3.Connection) -> None:
    """First run: load the bundled demo exam so the simulator works out of the box."""
    if con.execute("select 1 from exams").fetchone():
        return
    data = json.loads((BASE / "seed" / "exam.json").read_text())
    exam_id = con.execute(
        "insert into exams (title, sections, minutes_per_section, published) values (?, ?, ?, 1)",
        (data["title"], data["sections"], data["minutes_per_section"]),
    ).lastrowid
    for q in data["questions"]:
        image = None
        if q["image"]:
            image = f"seed-{q['image']}"
            shutil.copy(BASE / "seed" / q["image"], UPLOADS / image)
        con.execute(
            "insert into questions (exam_id, section, text, image, options, answer, explanation) values (?, ?, ?, ?, ?, ?, ?)",
            (exam_id, q["section"], q["text"], image, json.dumps(q["options"]), q["answer"], q["explanation"]),
        )


with connect() as _con:
    _con.executescript(SCHEMA)
    seed(_con)

app = FastAPI(title="NEET-PG Simulator API")


def hash_password(password: str, salt: bytes) -> str:
    return salt.hex() + "$" + hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1).hex()


def admin_hash(con: sqlite3.Connection) -> str | None:
    row = con.execute("select value from settings where key = 'admin_hash'").fetchone()
    return row and row["value"]


def require_admin(x_admin_key: str = Header(default=""), con=Depends(db)) -> None:
    stored = admin_hash(con)
    if not stored:
        raise HTTPException(401, "Admin password not set yet")
    if not secrets.compare_digest(hash_password(x_admin_key, bytes.fromhex(stored.split("$")[0])), stored):
        raise HTTPException(401, "Wrong admin password")


# ---------- helpers ----------

def image_url(name: str | None) -> str | None:
    return f"/uploads/{name}" if name else None


def question_json(r: sqlite3.Row, with_answer: bool) -> dict:
    q = {"id": r["id"], "section": r["section"], "text": r["text"], "image": image_url(r["image"]), "options": json.loads(r["options"])}
    if with_answer:
        q |= {"answer": r["answer"], "explanation": r["explanation"]}
    return q


def exam_json(con: sqlite3.Connection, r: sqlite3.Row, with_answers: bool | None = None) -> dict:
    e = {k: r[k] for k in r.keys()} | {"published": bool(r["published"])}
    e["question_count"] = con.execute("select count(*) from questions where exam_id = ?", (r["id"],)).fetchone()[0]
    if with_answers is not None:
        rows = con.execute("select * from questions where exam_id = ? order by section, id", (r["id"],)).fetchall()
        e["questions"] = [question_json(q, with_answers) for q in rows]
    return e


def get_exam(con: sqlite3.Connection, exam_id: int, published_only: bool) -> sqlite3.Row:
    r = con.execute("select * from exams where id = ?", (exam_id,)).fetchone()
    if not r or (published_only and not r["published"]):
        raise HTTPException(404, "Exam not found")
    return r


# Signatures of the image formats we accept. SVG is rejected because it can carry scripts.
MAGIC = {b"\x89PNG\r\n\x1a\n": "png", b"\xff\xd8\xff": "jpg", b"GIF87a": "gif", b"GIF89a": "gif"}


def save_image(f: UploadFile) -> str:
    data = f.file.read(MAX_IMAGE + 1)
    if len(data) > MAX_IMAGE:
        raise HTTPException(413, "Image must be 5 MB or smaller")
    ext = next((e for sig, e in MAGIC.items() if data.startswith(sig)), None)
    if not ext and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        ext = "webp"
    if not ext:
        raise HTTPException(400, "Image must be PNG, JPEG, GIF or WebP")
    name = f"{uuid.uuid4().hex}.{ext}"
    (UPLOADS / name).write_bytes(data)
    return name


def delete_image(name: str | None) -> None:
    if name:
        (UPLOADS / name).unlink(missing_ok=True)


def validate_question(con, exam_id: int, section: int, options: list[str], answer: int) -> None:
    sections = get_exam(con, exam_id, False)["sections"]
    if not 0 <= section < sections:
        raise HTTPException(400, f"Section must be between 0 and {sections - 1}")
    if len(options) != 4 or any(not o.strip() for o in options):
        raise HTTPException(400, "Exactly 4 non-empty options are required")
    if not 0 <= answer < 4:
        raise HTTPException(400, "Correct option must be 0-3")


# ---------- student API ----------

@app.get("/api/exams")
def list_published(con=Depends(db)):
    rows = con.execute("select * from exams where published = 1 order by id desc").fetchall()
    return [exam_json(con, r) for r in rows]


@app.get("/api/exams/{exam_id}")
def get_published(exam_id: int, con=Depends(db)):
    return exam_json(con, get_exam(con, exam_id, True), with_answers=False)


class Submission(BaseModel):
    answers: dict[int, int | None]  # question id -> chosen option index


@app.post("/api/exams/{exam_id}/submit")
def submit(exam_id: int, body: Submission, con=Depends(db)):
    exam = get_exam(con, exam_id, True)
    rows = con.execute("select id, answer, explanation from questions where exam_id = ?", (exam_id,)).fetchall()
    right = wrong = 0
    for r in rows:
        chosen = body.answers.get(r["id"])
        if chosen is None:
            continue
        if chosen == r["answer"]:
            right += 1
        else:
            wrong += 1
    return {
        "right": right,
        "wrong": wrong,
        "unattempted": len(rows) - right - wrong,
        "score": right * exam["marks_correct"] - wrong * exam["marks_wrong"],
        "max_score": len(rows) * exam["marks_correct"],
        "key": {r["id"]: {"answer": r["answer"], "explanation": r["explanation"]} for r in rows},
    }


# ---------- admin API ----------

admin = [Depends(require_admin)]


class Setup(BaseModel):
    password: str = Field(min_length=6, max_length=200)


@app.get("/api/admin/setup")
def setup_needed(con=Depends(db)):
    return {"needed": admin_hash(con) is None}


@app.post("/api/admin/setup", status_code=204)
def setup(body: Setup, con=Depends(db)):
    """First run only: whoever opens the admin panel first sets the password."""
    try:
        con.execute("insert into settings (key, value) values ('admin_hash', ?)", (hash_password(body.password, os.urandom(16)),))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Admin password is already set")


class ExamIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    sections: int = Field(5, ge=1, le=26)
    minutes_per_section: int = Field(4, ge=1, le=300)
    marks_correct: int = Field(4, ge=0, le=100)
    marks_wrong: int = Field(1, ge=0, le=100)


class ExamPatch(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    sections: int | None = Field(None, ge=1, le=26)
    minutes_per_section: int | None = Field(None, ge=1, le=300)
    marks_correct: int | None = Field(None, ge=0, le=100)
    marks_wrong: int | None = Field(None, ge=0, le=100)
    published: bool | None = None


@app.get("/api/admin/exams", dependencies=admin)
def admin_list(con=Depends(db)):
    return [exam_json(con, r) for r in con.execute("select * from exams order by id desc").fetchall()]


@app.post("/api/admin/exams", dependencies=admin, status_code=201)
def admin_create(body: ExamIn, con=Depends(db)):
    cur = con.execute(
        "insert into exams (title, sections, minutes_per_section, marks_correct, marks_wrong) values (?, ?, ?, ?, ?)",
        (body.title, body.sections, body.minutes_per_section, body.marks_correct, body.marks_wrong),
    )
    return exam_json(con, get_exam(con, cur.lastrowid, False), with_answers=True)


@app.get("/api/admin/exams/{exam_id}", dependencies=admin)
def admin_get(exam_id: int, con=Depends(db)):
    return exam_json(con, get_exam(con, exam_id, False), with_answers=True)


@app.patch("/api/admin/exams/{exam_id}", dependencies=admin)
def admin_update(exam_id: int, body: ExamPatch, con=Depends(db)):
    exam = get_exam(con, exam_id, False)
    changes = body.model_dump(exclude_none=True)
    sections = changes.get("sections", exam["sections"])
    if con.execute("select 1 from questions where exam_id = ? and section >= ?", (exam_id, sections)).fetchone():
        raise HTTPException(400, "Move or delete questions in the removed sections first")
    if changes.get("published"):
        for s in range(sections):
            if not con.execute("select 1 from questions where exam_id = ? and section = ?", (exam_id, s)).fetchone():
                raise HTTPException(400, f"Section {chr(65 + s)} has no questions. Every section needs at least one before publishing.")
    if changes:
        cols = ", ".join(f"{k} = ?" for k in changes)  # keys come from the pydantic model, not the client
        con.execute(f"update exams set {cols} where id = ?", (*changes.values(), exam_id))
    return exam_json(con, get_exam(con, exam_id, False), with_answers=True)


@app.delete("/api/admin/exams/{exam_id}", dependencies=admin, status_code=204)
def admin_delete(exam_id: int, con=Depends(db)):
    get_exam(con, exam_id, False)
    for (img,) in con.execute("select image from questions where exam_id = ?", (exam_id,)).fetchall():
        delete_image(img)
    con.execute("delete from exams where id = ?", (exam_id,))


@app.post("/api/admin/exams/{exam_id}/questions", dependencies=admin, status_code=201)
def admin_add_question(
    exam_id: int,
    section: int = Form(...),
    text: str = Form(..., min_length=1),
    options: list[str] = Form(...),
    answer: int = Form(...),
    explanation: str = Form(""),
    image: UploadFile | None = File(None),
    con=Depends(db),
):
    validate_question(con, exam_id, section, options, answer)
    name = save_image(image) if image and image.filename else None
    cur = con.execute(
        "insert into questions (exam_id, section, text, image, options, answer, explanation) values (?, ?, ?, ?, ?, ?, ?)",
        (exam_id, section, text, name, json.dumps(options), answer, explanation),
    )
    return question_json(con.execute("select * from questions where id = ?", (cur.lastrowid,)).fetchone(), True)


@app.put("/api/admin/questions/{qid}", dependencies=admin)
def admin_update_question(
    qid: int,
    section: int = Form(...),
    text: str = Form(..., min_length=1),
    options: list[str] = Form(...),
    answer: int = Form(...),
    explanation: str = Form(""),
    image: UploadFile | None = File(None),
    remove_image: bool = Form(False),
    con=Depends(db),
):
    old = con.execute("select * from questions where id = ?", (qid,)).fetchone()
    if not old:
        raise HTTPException(404, "Question not found")
    validate_question(con, old["exam_id"], section, options, answer)
    name = old["image"]
    if (image and image.filename) or remove_image:
        delete_image(name)
        name = save_image(image) if image and image.filename else None
    con.execute(
        "update questions set section = ?, text = ?, image = ?, options = ?, answer = ?, explanation = ? where id = ?",
        (section, text, name, json.dumps(options), answer, explanation, qid),
    )
    return question_json(con.execute("select * from questions where id = ?", (qid,)).fetchone(), True)


@app.delete("/api/admin/questions/{qid}", dependencies=admin, status_code=204)
def admin_delete_question(qid: int, con=Depends(db)):
    old = con.execute("select image from questions where id = ?", (qid,)).fetchone()
    if not old:
        raise HTTPException(404, "Question not found")
    delete_image(old["image"])
    con.execute("delete from questions where id = ?", (qid,))


# ---------- static files ----------

app.mount("/uploads", StaticFiles(directory=UPLOADS), name="uploads")
DIST = BASE.parent / "frontend" / "dist"
if DIST.exists():  # production: serve the built React app from the same server
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")

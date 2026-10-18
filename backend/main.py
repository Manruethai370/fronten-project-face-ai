import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from typing import Any

import bcrypt
import pymysql
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from pymysql.cursors import DictCursor
from fastapi.responses import FileResponse

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="Face Attendance API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class ProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=32)
    nickname: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=2000)
    year: str | None = Field(default=None, max_length=32)
    group: str | None = Field(default=None, max_length=64)
    avatar: str | None = Field(default=None, max_length=500000)


class PreferencesUpdate(BaseModel):
    preferences: dict[str, Any]


class PasswordUpdate(BaseModel):
    current_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=255)


class AttendanceRequest(BaseModel):
    session_id: int = Field(gt=0)
    confirm_manual: bool


def database_connection():
    required = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise HTTPException(status_code=503, detail="Database is not configured")
    try:
        return pymysql.connect(
            host=os.environ["DB_HOST"],
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            database=os.environ["DB_NAME"],
            charset="utf8mb4",
            cursorclass=DictCursor,
            connect_timeout=5,
            read_timeout=10,
            write_timeout=10,
            autocommit=False,
        )
    except pymysql.MySQLError as exc:
        raise HTTPException(status_code=503, detail="Unable to connect to database") from exc


@contextmanager
def db_cursor():
    connection = database_connection()
    try:
        with connection.cursor() as cursor:
            yield cursor
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def format_database_time(value: Any, include_seconds: bool = False) -> str | None:
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M:%S" if include_seconds else "%H:%M")
    if hasattr(value, "total_seconds"):
        seconds = int(value.total_seconds())
        hours, remainder = divmod(seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}" if include_seconds else f"{hours:02d}:{minutes:02d}"
    return str(value)


def encode_token(payload: dict[str, Any]) -> str:
    secret = os.getenv("SESSION_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Session signing is not configured")
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = hmac.new(secret.encode(), body, hashlib.sha256).digest()
    return f"{body.decode()}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def current_student(request: Request) -> dict[str, Any]:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ")
    secret = os.getenv("SESSION_SECRET")
    if not token or not secret or "." not in token:
        raise HTTPException(status_code=401, detail="Authentication required")
    body, supplied_signature = token.rsplit(".", 1)
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()
    try:
        signature = base64.urlsafe_b64decode(supplied_signature + "=" * (-len(supplied_signature) % 4))
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Invalid session") from None
    if not hmac.compare_digest(signature, expected) or payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return payload


@app.get("/")
def root():
    return {"message": "Face Attendance API"}


@app.get("/api/health/database")
def database_health():
    required = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        return {"status": "not_configured", "missing": missing}

    connection = None
    try:
        connection = database_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 AS connected, VERSION() AS server_version, DATABASE() AS database_name")
            result = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = DATABASE()")
            table_count = cursor.fetchone()["table_count"]
        return {
            "status": "connected",
            "database": result["database_name"],
            "server_version": result["server_version"],
            "table_count": table_count,
        }
    except HTTPException:
        return {"status": "disconnected", "message": "Unable to connect to configured database"}
    except pymysql.MySQLError:
        return {"status": "disconnected", "message": "Unable to query configured database"}
    finally:
        if connection:
            connection.close()


@app.post("/api/auth/login")
def login(body: LoginRequest):
    with db_cursor() as cursor:
        cursor.execute(
                """SELECT u.id, u.email, u.password_hash, u.role,
                             s.id AS student_id, t.id AS teacher_id
               FROM users u
               LEFT JOIN students s ON s.user_id = u.id
               LEFT JOIN teachers t ON t.user_id = u.id
               WHERE u.is_active = 1 AND (
                   LOWER(u.email) = LOWER(%s)
                   OR LOWER(SUBSTRING_INDEX(u.email, '@', 1)) = LOWER(%s)
                   OR s.student_code = %s
                   OR t.teacher_code = %s
               )
               LIMIT 1""",
            (body.username.strip(), body.username.strip(), body.username.strip(), body.username.strip()),
        )
        user = cursor.fetchone()
    if (
        not user
        or (user["role"] == "student" and user["student_id"] is None)
        or (user["role"] == "teacher" and user["teacher_id"] is None)
        or user["role"] not in ("student", "teacher")
        or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode())
    ):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    token = encode_token({
        "user_id": user["id"], "student_id": user["student_id"],
        "teacher_id": user["teacher_id"], "role": user["role"],
        "exp": time.time() + 60 * 60 * 12,
    })
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.get("/api/student/data")
def student_data(session: dict[str, Any] = Depends(current_student)):
    student_id = session["student_id"]
    with db_cursor() as cursor:
        cursor.execute(
            """SELECT s.id, s.student_code, s.first_name, s.last_name, s.faculty, s.major,
                      s.phone, s.nickname, s.address, s.avatar_path, s.year_level,
                      s.group_name, u.email, s.created_at
               FROM students s JOIN users u ON u.id = s.user_id
               WHERE s.id = %s AND u.is_active = 1""",
            (student_id,),
        )
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=401, detail="Student account is unavailable")

        cursor.execute(
            """SELECT c.course_code, c.course_name, c.credit, cl.class_name, cl.semester,
                      cl.academic_year, e.status AS enrollment_status,
                      t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
                      COALESCE(att.total_sessions, 0) AS total_sessions,
                      COALESCE(att.attended, 0) AS attended,
                      COALESCE(att.late_count, 0) AS late_count,
                      COALESCE(att.absent, 0) AS absent,
                      GROUP_CONCAT(DISTINCT CONCAT(sch.day_of_week, ' ', TIME_FORMAT(sch.start_time, '%%H:%%i'), '-', TIME_FORMAT(sch.end_time, '%%H:%%i')) ORDER BY sch.day_of_week, sch.start_time SEPARATOR ', ') AS schedule_text,
                      MAX(sch.room) AS schedule_room
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               LEFT JOIN teachers t ON t.id = c.teacher_id
               LEFT JOIN (
                 SELECT e2.id AS enrollment_id, COUNT(DISTINCT ses.id) AS total_sessions,
                     SUM(ad.status = 'present') AS attended,
                     SUM(ad.status = 'late') AS late_count,
                     SUM(ad.status = 'absent') AS absent
                 FROM enrollments e2
                 JOIN attendance_sessions ses ON ses.class_id = e2.class_id
                 LEFT JOIN attendance_details ad ON ad.session_id = ses.id AND ad.enrollment_id = e2.id
                 GROUP BY e2.id
               ) att ON att.enrollment_id = e.id
               LEFT JOIN student_class_schedule sch ON sch.class_id = cl.id
               WHERE e.student_id = %s AND e.status <> 'withdrawn'
               GROUP BY e.id, c.course_code, c.course_name, c.credit, cl.class_name,
                        cl.semester, cl.academic_year, e.status, t.first_name, t.last_name,
                        att.total_sessions, att.attended, att.late_count, att.absent
               ORDER BY cl.academic_year DESC, cl.semester DESC, c.course_code""",
            (student_id,),
        )
        course_rows = cursor.fetchall()

        cursor.execute(
            """SELECT a.id, a.title, a.body, a.pinned, a.category, a.created_at, c.course_code,
                      t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
               FROM announcements a
               LEFT JOIN classes cl ON cl.id = a.class_id
               LEFT JOIN courses c ON c.id = cl.course_id
               LEFT JOIN teachers t ON t.id = a.teacher_id
               WHERE a.class_id IS NULL OR a.class_id IN (
                   SELECT class_id FROM enrollments WHERE student_id = %s AND status = 'enrolled'
               )
               ORDER BY a.pinned DESC, a.created_at DESC""",
            (student_id,),
        )
        announcement_rows = cursor.fetchall()

        cursor.execute(
            """SELECT ses.session_date, ad.check_in_time, c.course_code, cl.class_name,
                      ad.status, ad.method, ad.confidence, ses.start_time, ses.id AS session_id
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               JOIN attendance_sessions ses ON ses.class_id = cl.id
               JOIN attendance_details ad ON ad.session_id = ses.id AND ad.enrollment_id = e.id
               WHERE e.student_id = %s AND e.status = 'enrolled'
               ORDER BY ses.session_date DESC, ses.start_time DESC, c.course_code""",
            (student_id,),
        )
        checkin_rows = cursor.fetchall()

        cursor.execute(
            """SELECT c.course_code, c.course_name, cl.class_name, ses.start_time,
                      ses.end_time, ad.status, ad.check_in_time
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               JOIN attendance_sessions ses ON ses.class_id = cl.id
               LEFT JOIN attendance_details ad ON ad.session_id = ses.id AND ad.enrollment_id = e.id
               WHERE e.student_id = %s AND e.status = 'enrolled' AND ses.session_date = CURDATE()
               ORDER BY ses.start_time, c.course_code""",
            (student_id,),
        )
        today_rows = cursor.fetchall()

        cursor.execute(
            """SELECT fp.image_path, fp.created_at, fa.status AS approval_status
               FROM face_profiles fp
               LEFT JOIN face_approvals fa ON fa.face_profile_id = fp.id
               WHERE fp.student_id = %s AND fp.is_active = 1
               ORDER BY fp.created_at DESC LIMIT 1""",
            (student_id,),
        )
        face = cursor.fetchone()

        cursor.execute("SELECT preferences FROM student_preferences WHERE student_id = %s", (student_id,))
        preference_row = cursor.fetchone()
        cursor.execute("SELECT announcement_id FROM student_announcement_reads WHERE student_id = %s", (student_id,))
        read_rows = cursor.fetchall()
        cursor.execute(
            """SELECT c.course_code, c.course_name, cl.class_name, cl.semester, cl.academic_year,
                      sch.day_of_week, sch.start_time, sch.end_time, sch.room,
                      t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               JOIN student_class_schedule sch ON sch.class_id = cl.id
               LEFT JOIN teachers t ON t.id = c.teacher_id
               WHERE e.student_id = %s AND e.status = 'enrolled' AND sch.id IS NOT NULL
               ORDER BY cl.academic_year DESC, cl.semester DESC, sch.day_of_week, sch.start_time""",
            (student_id,),
        )
        schedule_rows = cursor.fetchall()

    profile = {
        "fullName": f"{student['first_name']} {student['last_name']}",
        "nickname": student.get("nickname") or "",
        "studentCode": student["student_code"],
        "email": student["email"],
        "phone": student["phone"] or "",
        "faculty": student["faculty"] or "",
        "university": "มหาวิทยาลัยแม่โจ้",
        "major": student["major"] or "",
        "year": student.get("year_level") or "",
        "group": student.get("group_name") or "",
        "address": student.get("address") or "",
        "joined": student["created_at"].date().isoformat(),
        "avatar": "",
    }
    if student.get("avatar_path"):
        avatar_file = Path(os.getenv("UPLOAD_DIR", Path(__file__).with_name("uploads"))) / student["avatar_path"]
        if avatar_file.is_file():
            extension = avatar_file.suffix.lower()
            mime_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(extension)
            if mime_type:
                profile["avatar"] = f"data:{mime_type};base64,{base64.b64encode(avatar_file.read_bytes()).decode()}"
    courses = []
    for row in course_rows:
        courses.append({
            "code": row["course_code"], "name": row["course_name"], "nameEn": "",
            "teacher": " ".join(filter(None, [row["teacher_first_name"], row["teacher_last_name"]])) or "-",
            "schedule": row["schedule_text"] or "",
            "room": row["schedule_room"] or "", "attended": int(row["attended"] or 0),
            "late": int(row["late_count"] or 0), "absent": int(row["absent"] or 0),
            "total": int(row["total_sessions"] or 0),
            "term": f"{row['semester'] or ''}/{row['academic_year'] or ''}".strip("/"),
            "status": "finished" if row["enrollment_status"] == "completed" else "studying",
            "credit": row["credit"] or 0,
        })
    announcements = [{
        "id": row["id"], "pinned": bool(row["pinned"]), "category": row["category"],
        "color": "rose" if row["pinned"] else "blue", "icon": "megaphone",
        "title": row["title"], "body": row["body"],
        "teacher": " ".join(filter(None, [row["teacher_first_name"], row["teacher_last_name"]])) or "ฝ่ายดูแลระบบ",
        "course": row["course_code"], "date": row["created_at"].date().isoformat(),
        "time": row["created_at"].strftime("%H:%M"),
    } for row in announcement_rows]
    checkins = [{
        "id": row["session_id"], "iso": row["session_date"].isoformat(),
        "time": format_database_time(row["check_in_time"], include_seconds=True) or "-",
        "code": row["course_code"], "room": row["class_name"] or row["course_code"],
        "status": {"present": "ontime", "late": "late", "absent": "absent"}.get(row["status"], "absent"),
        "method": row["method"] or "-", "confidence": float(row["confidence"]) if row["confidence"] is not None else None,
    } for row in checkin_rows]
    today_classes = [{
        "code": row["course_code"], "time": format_database_time(row["start_time"]) or "--:--",
        "endTime": format_database_time(row["end_time"]) or "--:--",
        "status": {"present": "checked", "late": "checked", "absent": "absent"}.get(row["status"], "pending"),
        "checkedAt": format_database_time(row["check_in_time"]),
    } for row in today_rows]
    return {
        "profile": profile,
        "courses": courses,
        "announcements": announcements,
        "checkins": checkins,
        "todayClasses": today_classes,
        "face": {
            "registered": bool(face), "at": face["created_at"].isoformat() if face else None,
            "approvalStatus": face["approval_status"] if face else None,
        },
        "preferences": json.loads(preference_row["preferences"]) if preference_row else {},
        "readIds": [row["announcement_id"] for row in read_rows],
        "schedule": [{
            "code": row["course_code"], "name": row["course_name"], "className": row["class_name"],
            "term": f"{row['semester'] or ''}/{row['academic_year'] or ''}".strip("/"),
            "day": row["day_of_week"], "startTime": format_database_time(row["start_time"]),
            "endTime": format_database_time(row["end_time"]), "room": row["room"] or "",
            "teacher": " ".join(filter(None, [row["teacher_first_name"], row["teacher_last_name"]])) or "-",
        } for row in schedule_rows],
    }


@app.patch("/api/student/profile")
def update_student_profile(body: ProfileUpdate, session: dict[str, Any] = Depends(current_student)):
    phone = body.phone.strip() if body.phone else None
    if phone and not re.fullmatch(r"[0-9+\-\s]{9,15}", phone):
        raise HTTPException(status_code=422, detail="Invalid phone number")
    if body.avatar and not re.fullmatch(r"data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+", body.avatar):
        raise HTTPException(status_code=422, detail="Invalid avatar image")
    avatar_path = None
    if body.avatar:
        encoded = body.avatar.split(",", 1)[1]
        if len(encoded) > 400_000:
            raise HTTPException(status_code=413, detail="Avatar image is too large")
        extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(body.avatar.split(";", 1)[0][5:])
        if not extension:
            raise HTTPException(status_code=415, detail="Avatar must be JPEG, PNG, or WebP")
        avatar_root = Path(os.getenv("UPLOAD_DIR", Path(__file__).with_name("uploads"))) / "avatars"
        avatar_root.mkdir(parents=True, exist_ok=True)
        avatar_filename = f"{session['student_id']}{extension}"
        avatar_path = str(Path("avatars") / avatar_filename)
        (avatar_root / avatar_filename).write_bytes(base64.b64decode(encoded, validate=True))
    fields = {
        "phone": ("phone", phone or None),
        "nickname": ("nickname", body.nickname.strip() if body.nickname else None),
        "address": ("address", body.address.strip() if body.address else None),
        "year": ("year_level", body.year.strip() if body.year else None),
        "group": ("group_name", body.group.strip() if body.group else None),
        "avatar": ("avatar_path", avatar_path),
    }
    with db_cursor() as cursor:
        assignments = []
        values = []
        saved_fields = {}
        for key, (column, value) in fields.items():
            if key in body.model_fields_set:
                assignments.append(f"{column} = %s")
                values.append(value)
                saved_fields[key] = value
        if not assignments:
            return {"ok": True}
        cursor.execute(
            f"UPDATE students SET {', '.join(assignments)} WHERE id = %s",
            (*values, session["student_id"]),
        )
        if cursor.rowcount != 1:
            cursor.execute("SELECT id FROM students WHERE id = %s", (session["student_id"],))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Student not found")
    return {"ok": True, "profile": saved_fields}


@app.get("/api/student/avatar/{student_id}")
def student_avatar(student_id: int, session: dict[str, Any] = Depends(current_student)):
    if student_id != session["student_id"]:
        raise HTTPException(status_code=403, detail="Cannot access another student's avatar")
    with db_cursor() as cursor:
        cursor.execute("SELECT avatar_path FROM students WHERE id = %s", (student_id,))
        row = cursor.fetchone()
    if not row or not row["avatar_path"]:
        raise HTTPException(status_code=404, detail="Avatar not found")
    path = Path(os.getenv("UPLOAD_DIR", Path(__file__).with_name("uploads"))) / row["avatar_path"]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Avatar file not found")
    return FileResponse(path)


@app.get("/api/student/preferences")
def get_student_preferences(session: dict[str, Any] = Depends(current_student)):
    with db_cursor() as cursor:
        cursor.execute("SELECT preferences FROM student_preferences WHERE student_id = %s", (session["student_id"],))
        row = cursor.fetchone()
    return json.loads(row["preferences"]) if row else {}


@app.put("/api/student/preferences")
def save_student_preferences(body: PreferencesUpdate, session: dict[str, Any] = Depends(current_student)):
    serialized = json.dumps(body.preferences, separators=(",", ":"))
    with db_cursor() as cursor:
        cursor.execute(
            """INSERT INTO student_preferences (student_id, preferences) VALUES (%s, %s)
               ON DUPLICATE KEY UPDATE preferences = VALUES(preferences)""",
            (session["student_id"], serialized),
        )
    return body.preferences


@app.get("/api/student/announcement-reads")
def get_announcement_reads(session: dict[str, Any] = Depends(current_student)):
    with db_cursor() as cursor:
        cursor.execute("SELECT announcement_id FROM student_announcement_reads WHERE student_id = %s", (session["student_id"],))
        rows = cursor.fetchall()
    return [row["announcement_id"] for row in rows]


@app.post("/api/student/announcement-reads")
def mark_announcement_reads(body: list[int], session: dict[str, Any] = Depends(current_student)):
    if not body:
        return {"read_ids": []}
    with db_cursor() as cursor:
        requested_ids = list(set(body))
        placeholders = ",".join(["%s"] * len(requested_ids))
        cursor.execute(
            f"""SELECT a.id FROM announcements a
                WHERE a.id IN ({placeholders}) AND (
                    a.class_id IS NULL OR a.class_id IN (
                        SELECT class_id FROM enrollments WHERE student_id = %s AND status = 'enrolled'
                    )
                )""",
            (*requested_ids, session["student_id"]),
        )
        valid_ids = [row["id"] for row in cursor.fetchall()]
        if not valid_ids:
            return {"read_ids": []}
        cursor.executemany(
            "INSERT IGNORE INTO student_announcement_reads (student_id, announcement_id) VALUES (%s, %s)",
            [(session["student_id"], announcement_id) for announcement_id in valid_ids],
        )
    return {"read_ids": valid_ids}


@app.get("/api/student/schedule")
def student_schedule(session: dict[str, Any] = Depends(current_student)):
    with db_cursor() as cursor:
        cursor.execute(
            """SELECT c.course_code, c.course_name, cl.class_name, cl.semester, cl.academic_year,
                      sch.day_of_week, sch.start_time, sch.end_time, sch.room,
                      t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               LEFT JOIN student_class_schedule sch ON sch.class_id = cl.id
               LEFT JOIN teachers t ON t.id = c.teacher_id
               WHERE e.student_id = %s AND e.status = 'enrolled' AND sch.id IS NOT NULL
               ORDER BY cl.academic_year DESC, cl.semester DESC, sch.day_of_week, sch.start_time""",
            (session["student_id"],),
        )
        rows = cursor.fetchall()
    return [{
        "code": row["course_code"], "name": row["course_name"], "className": row["class_name"],
        "term": f"{row['semester'] or ''}/{row['academic_year'] or ''}".strip("/"),
        "day": int(row["day_of_week"]), "startTime": format_database_time(row["start_time"]),
        "endTime": format_database_time(row["end_time"]), "room": row["room"] or row["class_name"] or "",
        "teacher": " ".join(filter(None, [row["teacher_first_name"], row["teacher_last_name"]])) or "-",
    } for row in rows]


@app.post("/api/student/face-registration")
def register_student_face(files: list[UploadFile] = File(...), session: dict[str, Any] = Depends(current_student)):
    if not 1 <= len(files) <= 6:
        raise HTTPException(status_code=422, detail="Upload between 1 and 6 face images")
    image_paths = []
    root = Path(os.getenv("UPLOAD_DIR", Path(__file__).with_name("uploads"))) / "faces"
    root.mkdir(parents=True, exist_ok=True)
    try:
        for image in files:
            if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
                raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are supported")
            content = image.file.read(2_000_001)
            if not content or len(content) > 2_000_000:
                raise HTTPException(status_code=413, detail="Each face image must be under 2 MB")
            signature_valid = (
                image.content_type == "image/jpeg" and content.startswith(b"\xff\xd8\xff")
            ) or (
                image.content_type == "image/png" and content.startswith(b"\x89PNG\r\n\x1a\n")
            ) or (
                image.content_type == "image/webp" and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
            )
            if not signature_valid:
                raise HTTPException(status_code=415, detail="Image content does not match its file type")
            try:
                with Image.open(BytesIO(content)) as decoded_image:
                    expected_format = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[image.content_type]
                    if decoded_image.format != expected_format or decoded_image.width < 64 or decoded_image.height < 64:
                        raise HTTPException(status_code=415, detail="Unsupported or too-small face image")
                    decoded_image.verify()
            except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
                raise HTTPException(status_code=415, detail="Invalid image file") from exc
            extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[image.content_type]
            filename = f"{session['student_id']}_{secrets.token_hex(16)}{extension}"
            (root / filename).write_bytes(content)
            image_paths.append(str(Path("faces") / filename))
        with db_cursor() as cursor:
            cursor.execute("UPDATE face_profiles SET is_active = 0 WHERE student_id = %s", (session["student_id"],))
            cursor.execute(
                "INSERT INTO face_profiles (student_id, image_path, embedding, is_active) VALUES (%s, %s, NULL, 1)",
                (session["student_id"], image_paths[0]),
            )
            face_profile_id = cursor.lastrowid
            cursor.executemany(
                "INSERT INTO student_face_images (face_profile_id, pose_index, image_path) VALUES (%s, %s, %s)",
                [(face_profile_id, index, path) for index, path in enumerate(image_paths)],
            )
            cursor.execute(
                """SELECT DISTINCT c.teacher_id FROM enrollments e
                   JOIN classes cl ON cl.id = e.class_id
                   JOIN courses c ON c.id = cl.course_id
                   WHERE e.student_id = %s AND e.status = 'enrolled' AND c.teacher_id IS NOT NULL""",
                (session["student_id"],),
            )
            teacher_ids = [row["teacher_id"] for row in cursor.fetchall()]
            if teacher_ids:
                cursor.executemany(
                    "INSERT INTO face_approvals (face_profile_id, teacher_id, status) VALUES (%s, %s, 'pending')",
                    [(face_profile_id, teacher_id) for teacher_id in teacher_ids],
                )
    except Exception:
        for relative_path in image_paths:
            (root / Path(relative_path).name).unlink(missing_ok=True)
        raise
    return {"registered": True, "approvalStatus": "pending", "imageCount": len(image_paths)}


@app.post("/api/student/checkins")
def student_checkin(body: AttendanceRequest, session: dict[str, Any] = Depends(current_student)):
    if not body.confirm_manual:
        raise HTTPException(status_code=400, detail="ยืนยันการเช็คชื่อแบบ manual ก่อน")
    with db_cursor() as cursor:
        cursor.execute(
            """SELECT e.id AS enrollment_id, s.id AS session_id, c.course_code,
                      cl.allow_manual_fallback, cl.checkin_open_offset_minutes,
                      cl.checkin_close_offset_minutes, cl.late_threshold_minutes,
                      TIMESTAMPDIFF(MINUTE, TIMESTAMP(s.session_date, s.start_time), NOW()) AS elapsed_minutes
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               JOIN attendance_sessions s ON s.class_id = cl.id
               WHERE e.student_id = %s AND e.status = 'enrolled'
                 AND s.id = %s AND s.session_date = CURDATE() AND s.start_time IS NOT NULL
               FOR UPDATE""",
            (session["student_id"], body.session_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="ไม่พบคาบเช็คชื่อของวันนี้")
        if not row["allow_manual_fallback"]:
            raise HTTPException(status_code=403, detail="รายวิชานี้ไม่อนุญาตให้เช็คชื่อแบบ manual")
        elapsed = row["elapsed_minutes"]
        if elapsed < -row["checkin_open_offset_minutes"] or elapsed > row["checkin_close_offset_minutes"]:
            raise HTTPException(status_code=403, detail="ยังไม่อยู่ในช่วงเวลาเช็คชื่อ")
        cursor.execute(
            "SELECT id FROM attendance_details WHERE session_id = %s AND enrollment_id = %s",
            (row["session_id"], row["enrollment_id"]),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="เช็คชื่อคาบนี้แล้ว")
        status = "late" if elapsed > row["late_threshold_minutes"] else "present"
        cursor.execute(
            """INSERT INTO attendance_details
               (session_id, enrollment_id, status, method, check_in_time, confidence)
               VALUES (%s, %s, %s, 'manual', CURTIME(), NULL)""",
            (row["session_id"], row["enrollment_id"], status),
        )
    return {"session_id": row["session_id"], "course_code": row["course_code"], "status": status, "method": "manual"}


@app.get("/api/student/checkin-options")
def student_checkin_options(session: dict[str, Any] = Depends(current_student)):
    with db_cursor() as cursor:
        cursor.execute(
            """SELECT s.id AS session_id, c.course_code, c.course_name, cl.class_name,
                      cl.allow_manual_fallback, s.start_time,
                      TIMESTAMPDIFF(MINUTE, TIMESTAMP(s.session_date, s.start_time), NOW()) AS elapsed_minutes,
                      cl.checkin_open_offset_minutes, cl.checkin_close_offset_minutes,
                      cl.late_threshold_minutes,
                      EXISTS(SELECT 1 FROM attendance_details ad
                             WHERE ad.session_id = s.id AND ad.enrollment_id = e.id) AS checked
               FROM enrollments e
               JOIN classes cl ON cl.id = e.class_id
               JOIN courses c ON c.id = cl.course_id
               JOIN attendance_sessions s ON s.class_id = cl.id
               WHERE e.student_id = %s AND e.status = 'enrolled'
                 AND s.session_date = CURDATE() AND s.start_time IS NOT NULL
               ORDER BY s.start_time, c.course_code""",
            (session["student_id"],),
        )
        rows = cursor.fetchall()
    return [{
        "sessionId": row["session_id"], "code": row["course_code"], "name": row["course_name"],
        "room": row["class_name"] or "", "startTime": format_database_time(row["start_time"]),
        "elapsedMinutes": row["elapsed_minutes"], "manualAllowed": bool(row["allow_manual_fallback"]),
        "checked": bool(row["checked"]), "openOffset": row["checkin_open_offset_minutes"],
        "closeOffset": row["checkin_close_offset_minutes"], "lateThreshold": row["late_threshold_minutes"],
        "open": -row["checkin_open_offset_minutes"] <= row["elapsed_minutes"] <= row["checkin_close_offset_minutes"],
    } for row in rows]


@app.post("/api/student/password")
def change_student_password(body: PasswordUpdate, session: dict[str, Any] = Depends(current_student)):
    if not re.search(r"[A-Za-z]", body.new_password) or not re.search(r"\d", body.new_password):
        raise HTTPException(status_code=422, detail="รหัสผ่านใหม่ต้องมีทั้งตัวอักษรและตัวเลข")
    with db_cursor() as cursor:
        cursor.execute("SELECT password_hash FROM users WHERE id = %s AND is_active = 1", (session["user_id"],))
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(body.current_password.encode(), user["password_hash"].encode()):
            raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
        password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
        cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (password_hash, session["user_id"]))
    return {"ok": True}


@app.delete("/api/student/account")
def delete_student_account(session: dict[str, Any] = Depends(current_student)):
    upload_root = Path(os.getenv("UPLOAD_DIR", Path(__file__).with_name("uploads"))).resolve()
    stored_paths = []
    with db_cursor() as cursor:
        cursor.execute("SELECT avatar_path FROM students WHERE id = %s", (session["student_id"],))
        student = cursor.fetchone()
        if student and student["avatar_path"]:
            stored_paths.append(student["avatar_path"])
        cursor.execute(
            """SELECT image_path FROM face_profiles WHERE student_id = %s
               UNION SELECT image_path FROM student_face_images sfi
                 JOIN face_profiles fp ON fp.id = sfi.face_profile_id WHERE fp.student_id = %s""",
            (session["student_id"], session["student_id"]),
        )
        stored_paths.extend(row["image_path"] for row in cursor.fetchall() if row["image_path"])
        cursor.execute("DELETE FROM users WHERE id = %s AND role = 'student'", (session["user_id"],))
        if cursor.rowcount != 1:
            raise HTTPException(status_code=404, detail="Student account not found")
    for relative_path in stored_paths:
        file_path = (upload_root / relative_path).resolve()
        if upload_root in file_path.parents:
            file_path.unlink(missing_ok=True)
    return {"ok": True}
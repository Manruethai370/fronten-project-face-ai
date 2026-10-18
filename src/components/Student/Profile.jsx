import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanFace,
  UserPlus,
  CalendarDays,
  User,
  ChevronRight,
  Pencil,
  Camera,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  CheckCircle2,
  CalendarCheck,
  BarChart3,
  Lock,
  AlertTriangle,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { updateProfile, useFaceRegistration, useProfile, useStudentData } from "./studentData";
import { t, fmtDateLong, fmtDateTime } from "./i18n";

// ช่องที่นักศึกษาแก้ไขเองได้ (ข้อมูลอื่นต้องให้อาจารย์/เจ้าหน้าที่แก้)
const EDITABLE = ["nickname", "phone", "address"];

const FIELDS = [
  { key: "fullName", label: t("ชื่อ-นามสกุล") },
  { key: "nickname", label: t("ชื่อเล่น") },
  { key: "studentCode", label: t("รหัสนักศึกษา") },
  { key: "email", label: "Email" },
  { key: "phone", label: t("เบอร์โทรศัพท์") },
  { key: "faculty", label: t("คณะ") },
  { key: "major", label: t("สาขาวิชา") },
  { key: "year", label: t("ชั้นปี") },
  { key: "group", label: t("กลุ่มเรียน") },
  { key: "address", label: t("ที่อยู่") },
];

export default function Profile() {
  const { checkins } = useStudentData();
  const profile = useProfile();
  const face = useFaceRegistration();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState({ tone: "", text: "" });
  const attendedCount = checkins.filter((item) => item.status !== "absent").length;
  const absentCount = checkins.filter((item) => item.status === "absent").length;
  const attendanceRate = checkins.length ? ((attendedCount / checkins.length) * 100).toFixed(1) : "0.0";

  const startEdit = () => {
    setDraft(Object.fromEntries(EDITABLE.map((k) => [k, profile[k]])));
    setMsg({ tone: "", text: "" });
    setEditing(true);
  };

  const save = async () => {
    const phone = (draft.phone || "").trim();
    if (phone && !/^[0-9+\-\s]{9,15}$/.test(phone)) {
      setMsg({ tone: "error", text: t("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง") });
      return;
    }
    try {
      await updateProfile({ nickname: (draft.nickname || "").trim(), phone, address: (draft.address || "").trim() });
      setEditing(false);
      setMsg({ tone: "success", text: t("บันทึกข้อมูลเรียบร้อยแล้ว") });
    } catch (error) {
      setMsg({ tone: "error", text: error.message });
    }
  };

  // เปลี่ยนรูปโปรไฟล์: ย่อรูปให้เล็กก่อนเก็บ เพื่อไม่ให้เกินพื้นที่ของเบราว์เซอร์
  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ tone: "error", text: t("กรุณาเลือกไฟล์รูปภาพ") });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const size = 200;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const s = Math.min(img.width, img.height);
      canvas.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      try {
        await updateProfile({ avatar: canvas.toDataURL("image/jpeg", 0.85) });
        setMsg({ tone: "success", text: t("เปลี่ยนรูปโปรไฟล์แล้ว") });
      } catch (error) {
        setMsg({ tone: "error", text: error.message });
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setMsg({ tone: "error", text: t("ไม่สามารถอ่านไฟล์รูปนี้ได้") });
    img.src = url;
  };

  return (
    <StudentLayout>
      {/* Title */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          {t("โปรไฟล์ของฉัน")}
          <User className="w-5 h-5 text-slate-400" />
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t("จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-5 items-start">
        {/* Left: avatar card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img src={profile.avatar} alt={profile.fullName} className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-50" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={t("เปลี่ยนรูปโปรไฟล์")}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center ring-4 ring-white"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>
            <div className="text-lg font-bold text-slate-900">{profile.fullName}</div>
            <div className="text-sm text-slate-400 mb-3">{t("นักศึกษา")}</div>
            <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              {t("รหัสนักศึกษา {code}", { code: profile.studentCode })}
            </span>
          </div>

          <div className="space-y-3 text-sm border-t border-slate-100 pt-5">
            <a href={`mailto:${profile.email}`} className="flex items-center gap-3 hover:text-blue-600">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600 truncate">{profile.email}</span>
            </a>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600">{profile.phone || "-"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600">{profile.faculty}</span>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600">{profile.university}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-600">{t("เข้าระบบเมื่อ {date}", { date: fmtDateLong(profile.joined) })}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={editing ? () => setEditing(false) : startEdit}
            className="w-full flex items-center justify-center gap-2 mt-6 border border-blue-200 text-blue-600 text-sm font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {editing ? t("ยกเลิกการแก้ไข") : t("แก้ไขข้อมูลโปรไฟล์")}
          </button>
          <p className="text-[11px] text-slate-400 mt-2 text-center">{t("แก้ไขได้เฉพาะชื่อเล่น เบอร์โทรศัพท์ และที่อยู่")}</p>
        </div>

        {/* Right: personal info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">{t("ข้อมูลส่วนตัว")}</h3>
            {editing ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  {t("ยกเลิก")}
                </button>
                <button type="button" onClick={save} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg">
                  {t("บันทึก")}
                </button>
              </div>
            ) : (
              <button type="button" onClick={startEdit} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                <Pencil className="w-3.5 h-3.5" />
                {t("แก้ไข")}
              </button>
            )}
          </div>

          {msg.text && (
            <div className={`text-sm mb-3 ${msg.tone === "success" ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</div>
          )}

          <div className="divide-y divide-slate-100">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3">
                <label htmlFor={`profile-${f.key}`} className="text-sm text-slate-400 w-36 shrink-0">
                  {f.label}
                </label>
                {editing && EDITABLE.includes(f.key) ? (
                  f.key === "address" ? (
                    <textarea
                      id={`profile-${f.key}`}
                      value={draft[f.key] || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      rows={2}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  ) : (
                    <input
                      id={`profile-${f.key}`}
                      value={draft[f.key] || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  )
                ) : (
                  <div className="text-sm text-slate-800 font-medium">{profile[f.key] || "-"}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Attendance info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t("ข้อมูลการเข้าเรียน")}</h3>
          <div className="space-y-2">
            <InfoRow to="/courses" icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-100" label={t("อัตราการเข้าเรียนเฉลี่ย")} value={`${attendanceRate}%`} />
            <InfoRow to="/history" icon={<CalendarCheck className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" label={t("เช็คชื่อทั้งหมด")} value={t("{n} ครั้ง", { n: checkins.length })} />
            <InfoRow to="/history" icon={<BarChart3 className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" label={t("ขาดเรียน")} value={t("{n} ครั้ง", { n: absentCount })} />
          </div>
        </div>

        {/* Right column stacked */}
        <div className="space-y-5">
          {/* Face registration */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">{t("การลงทะเบียนใบหน้า")}</h3>
              {face.registered ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t(face.approvalStatus === "approved" ? "อนุมัติแล้ว" : "รออนุมัติ")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t("ยังไม่ลงทะเบียน")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ScanFace className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{t("สถานะการลงทะเบียน")}</div>
                <div className="text-xs text-slate-500">
                  {face.registered ? t(face.approvalStatus === "approved" ? "ใบหน้าได้รับการอนุมัติแล้ว" : "ส่งรูปแล้ว รออาจารย์ตรวจสอบ") : t("กรุณาลงทะเบียนใบหน้า")}
                </div>
                {face.registered && face.at && <div className="text-xs text-slate-400 mt-0.5">{t("ลงทะเบียนเมื่อ {date}", { date: fmtDateTime(face.at) })}</div>}
              </div>
            </div>

            <Link
              to="/face-registration"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold py-3 rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
              {face.registered ? t("ส่งรูปใบหน้าใหม่") : t("ลงทะเบียนใบหน้า")}
            </Link>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">{t("ความปลอดภัย")}</h3>
            <Link to="/settings#security" className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">{t("เปลี่ยนรหัสผ่าน")}</div>
                <div className="text-xs text-slate-400">{t("อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี")}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function InfoRow({ to, icon, iconBg, label, value }) {
  return (
    <Link to={to} className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="text-left min-w-0 flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-base font-bold text-slate-900">{value}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </Link>
  );
}
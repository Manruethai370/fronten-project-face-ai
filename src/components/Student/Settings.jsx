import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Megaphone,
  User,
  Bell,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Pencil,
  Camera,
  Lock,
  Smartphone,
  Sun,
  Moon,
  Monitor,
  Globe,
  HelpCircle,
  Info,
  RotateCcw,
  Trash2,
  Mail,
  Volume2,
  Eye,
  EyeOff,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { clearLoginSession, resetPrefs, updatePrefs, usePrefs, useProfile } from "./studentData";
import { t, LANG, setLanguage } from "./i18n";

const settingsTabs = [
  { id: "personal", icon: User, label: t("ข้อมูลส่วนตัว"), sub: t("แก้ไขข้อมูลส่วนตัวของคุณ") },
  { id: "security", icon: Lock, label: t("ความปลอดภัย"), sub: t("เปลี่ยนรหัสผ่านและการยืนยันตัวตน") },
  { id: "notifications", icon: Bell, label: t("การแจ้งเตือน"), sub: t("จัดการการแจ้งเตือนต่างๆ") },
  { id: "theme", icon: Moon, label: t("ธีมและการแสดงผล"), sub: t("ตั้งค่าการแสดงผลและธีม") },
  { id: "language", icon: Globe, label: t("ภาษา"), sub: t("ตั้งค่าภาษาในการใช้งาน") },
  { id: "help", icon: HelpCircle, label: t("ช่วยเหลือ"), sub: t("ศูนย์ช่วยเหลือและคำถามที่พบบ่อย") },
  { id: "about", icon: Info, label: t("เกี่ยวกับระบบ"), sub: t("ข้อมูลเกี่ยวกับระบบ") },
];

const FAQ = [
  {
    q: t("ต้องลงทะเบียนใบหน้าก่อนเช็คชื่อหรือไม่?"),
    a: t("ต้องลงทะเบียนใบหน้าก่อน จึงจะเช็คชื่อด้วยการสแกนใบหน้าได้ ดูสถานะได้ที่หน้าโปรไฟล์"),
  },
  {
    q: t("สแกนใบหน้าไม่ผ่าน ต้องทำอย่างไร?"),
    a: t("อยู่ในที่ที่มีแสงสว่างเพียงพอ หันหน้าตรงเข้ากล้อง ถอดหน้ากาก/แว่นตา แล้วลองใหม่ หากยังไม่ผ่านให้แจ้งอาจารย์ผู้สอนเพื่อเช็คชื่อให้แทน"),
  },
  {
    q: t("ทำไมเช็คชื่อไม่ได้?"),
    a: t("ระบบเปิดให้เช็คชื่อเฉพาะช่วงเวลาที่อาจารย์กำหนดของแต่ละคาบ ตรวจสอบเวลาเปิด-ปิดได้ที่หน้าเช็คชื่อหรือตารางเรียน"),
  },
  {
    q: t("ผลการเช็คชื่อไม่ถูกต้อง แก้ได้อย่างไร?"),
    a: t("นักศึกษาแก้ผลการเช็คชื่อเองไม่ได้ กรุณาติดต่ออาจารย์ผู้สอนรายวิชานั้นพร้อมวันที่และเวลาของคาบเรียน"),
  },
  {
    q: t("ลืมรหัสผ่าน?"),
    a: t("หากยังเข้าสู่ระบบได้ เปลี่ยนรหัสผ่านได้ที่หัวข้อ \"ความปลอดภัย\" หากเข้าระบบไม่ได้ให้ติดต่ออาจารย์ผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน"),
  },
];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ชื่ออุปกรณ์/เบราว์เซอร์ที่ใช้อยู่ตอนนี้ (สำหรับหัวข้อ "อุปกรณ์ที่เข้าสู่ระบบ")
function currentDevice() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac/i.test(ua) ? "macOS" : /Windows/i.test(ua) ? "Windows" : /Linux/i.test(ua) ? "Linux" : t("อุปกรณ์ไม่ทราบชนิด");
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : t("เบราว์เซอร์");
  return t("{browser} บน {os}", { browser, os: t(os) });
}

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useProfile();
  const { colorMode, fontSize, notif, twoFA } = usePrefs();

  // /settings#security (เช่นจากหน้าโปรไฟล์) = เปิดฟอร์มเปลี่ยนรหัสผ่านทันที
  const initialTab = location.hash.slice(1);
  const [activeTab, setActiveTab] = useState(settingsTabs.some((tab) => tab.id === initialTab) ? initialTab : "personal");
  const [showPwForm, setShowPwForm] = useState(initialTab === "security");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState({ tone: "", text: "" });
  const [showDevices, setShowDevices] = useState(false);
  const [showMoreNotif, setShowMoreNotif] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [notice, setNotice] = useState("");

  const refs = {
    personal: useRef(null),
    security: useRef(null),
    notifications: useRef(null),
    theme: useRef(null),
    language: useRef(null),
    help: useRef(null),
    about: useRef(null),
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    refs[id].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const setNotif = (patch) => updatePrefs({ notif: { ...notif, ...patch } });

  // TODO: เมื่อเชื่อม backend แล้ว ให้ส่ง current/next ไปที่ API เปลี่ยนรหัสผ่าน
  const changePassword = () => {
    if (!pw.current) return setPwMsg({ tone: "error", text: t("กรุณากรอกรหัสผ่านปัจจุบัน") });
    if (pw.next.length < 8) return setPwMsg({ tone: "error", text: t("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร") });
    if (!/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next))
      return setPwMsg({ tone: "error", text: t("รหัสผ่านใหม่ต้องมีทั้งตัวอักษรและตัวเลข") });
    if (pw.next === pw.current) return setPwMsg({ tone: "error", text: t("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม") });
    if (pw.next !== pw.confirm) return setPwMsg({ tone: "error", text: t("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน") });
    setPw({ current: "", next: "", confirm: "" });
    setShowPwForm(false);
    setPwMsg({ tone: "success", text: t("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว") });
  };

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 2500);
  };

  const onReset = () => {
    if (window.confirm(t("รีเซ็ตธีม ขนาดตัวอักษร และการแจ้งเตือนกลับเป็นค่าเริ่มต้น?"))) {
      resetPrefs();
      flash(t("รีเซ็ตการตั้งค่าเรียบร้อยแล้ว"));
    }
  };

  // TODO: เมื่อเชื่อม backend แล้ว ให้ส่งคำขอลบบัญชีไปที่ API ก่อนออกจากระบบ
  const onDeleteAccount = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("faceattend_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    clearLoginSession();
    navigate("/login", { replace: true });
  };

  return (
    <StudentLayout>
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("ตั้งค่า")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("จัดการการตั้งค่าทั้งหมดของคุณ")}</p>
        </div>
        {notice && (
          <div role="status" className="text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
            {notice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Settings nav */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-1 lg:sticky lg:top-6">
          {settingsTabs.map(({ id, icon: Icon, label, sub }) => (
            <button
              type="button"
              key={id}
              onClick={() => handleTabClick(id)}
              className={`w-full flex items-start gap-3 text-left px-3.5 py-3 rounded-xl transition-colors ${
                activeTab === id ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-slate-500 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${activeTab === id ? "text-blue-600" : "text-slate-700"}`}>{label}</div>
                <div className="text-xs text-slate-400 leading-snug">{sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="space-y-5">
          {/* Personal info */}
          <div ref={refs.personal} id="settings-personal" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">{t("ข้อมูลส่วนตัว")}</h3>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 border border-blue-200 text-blue-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("แก้ไข")}
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative shrink-0 self-center sm:self-start">
                <img src={profile.avatar} alt={profile.fullName} className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50" />
                <Link
                  to="/profile"
                  aria-label={t("เปลี่ยนรูปโปรไฟล์")}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center ring-4 ring-white"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>

              <div className="flex-1 divide-y divide-slate-100">
                {[
                  [t("ชื่อ-นามสกุล"), profile.fullName],
                  [t("ชื่อเล่น"), profile.nickname],
                  [t("รหัสนักศึกษา"), profile.studentCode],
                  ["Email", profile.email],
                  [t("เบอร์โทรศัพท์"), profile.phone],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5">
                    <div className="text-sm text-slate-400 w-32 shrink-0">{label}</div>
                    <div className="text-sm text-slate-800 font-medium">{value || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="space-y-5">
              {/* Security */}
              <div ref={refs.security} id="settings-security" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">{t("ความปลอดภัย")}</h3>
                <div className="space-y-1">
                  <SettingRow
                    icon={<Lock className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    title={t("เปลี่ยนรหัสผ่าน")}
                    sub={t("อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี")}
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setShowPwForm((v) => !v);
                          setPwMsg({ tone: "", text: "" });
                        }}
                        aria-expanded={showPwForm}
                        className="flex items-center gap-1.5 text-blue-600 border border-blue-200 text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        {showPwForm ? t("ยกเลิก") : t("เปลี่ยนรหัสผ่าน")}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPwForm ? "rotate-90" : ""}`} />
                      </button>
                    }
                  />
                  {pwMsg.text && (
                    <div className={`text-sm px-2 ${pwMsg.tone === "success" ? "text-emerald-600" : "text-red-500"}`}>{pwMsg.text}</div>
                  )}
                  {showPwForm && (
                    <form
                      className="space-y-2.5 pt-2 pb-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        changePassword();
                      }}
                    >
                      {[
                        ["current", t("รหัสผ่านปัจจุบัน"), "current-password"],
                        ["next", t("รหัสผ่านใหม่ (อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข)"), "new-password"],
                        ["confirm", t("ยืนยันรหัสผ่านใหม่"), "new-password"],
                      ].map(([key, label, ac]) => (
                        <input
                          key={key}
                          type={showPw ? "text" : "password"}
                          placeholder={label}
                          aria-label={label}
                          autoComplete={ac}
                          value={pw[key]}
                          onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showPw ? t("ซ่อนรหัสผ่าน") : t("แสดงรหัสผ่าน")}
                      </button>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl">
                        {t("บันทึกรหัสผ่านใหม่")}
                      </button>
                    </form>
                  )}
                  <SettingRow
                    icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    title={t("การยืนยันตัวตนสองขั้นตอน (2FA)")}
                    sub={twoFA ? t("เปิดใช้งานแล้ว") : t("เพิ่มความปลอดภัยให้กับบัญชีของคุณ")}
                    action={
                      <Toggle
                        label={t("การยืนยันตัวตนสองขั้นตอน")}
                        checked={twoFA}
                        onChange={(v) => {
                          updatePrefs({ twoFA: v });
                          flash(v ? t("เปิดการยืนยันตัวตนสองขั้นตอนแล้ว") : t("ปิดการยืนยันตัวตนสองขั้นตอนแล้ว"));
                        }}
                      />
                    }
                  />
                  <SettingRow
                    icon={<Smartphone className="w-5 h-5 text-purple-600" />}
                    iconBg="bg-purple-100"
                    title={t("อุปกรณ์ที่เข้าสู่ระบบ")}
                    sub={t("จัดการอุปกรณ์ที่เข้าสู่ระบบบัญชีของคุณ")}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowDevices((v) => !v)}
                        aria-expanded={showDevices}
                        className="flex items-center gap-1.5 text-blue-600 border border-blue-200 text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        {showDevices ? t("ซ่อน") : t("ดูอุปกรณ์")}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDevices ? "rotate-90" : ""}`} />
                      </button>
                    }
                  />
                  {showDevices && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-2">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-800 font-medium truncate">{currentDevice()}</div>
                          <div className="text-xs text-emerald-600">{t("อุปกรณ์นี้ • กำลังใช้งาน")}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t("ออกจากระบบจากอุปกรณ์นี้?"))) {
                            clearLoginSession();
                            navigate("/login", { replace: true });
                          }
                        }}
                        className="text-xs font-semibold text-red-500 hover:underline"
                      >
                        {t("ออกจากระบบอุปกรณ์นี้")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div ref={refs.notifications} id="settings-notifications" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">{t("การแจ้งเตือน")}</h3>
                <div className="space-y-1">
                  <SettingRow
                    icon={<Bell className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    title={t("แจ้งเตือนการเช็คชื่อ")}
                    sub={t("แสดงคาบที่รอเช็คชื่อที่ไอคอนกระดิ่ง")}
                    action={<Toggle label={t("แจ้งเตือนการเช็คชื่อ")} checked={notif.checkin} onChange={(v) => setNotif({ checkin: v })} />}
                  />
                  <SettingRow
                    icon={<CalendarDays className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    title={t("แจ้งเตือนตารางเรียน")}
                    sub={t("รับการแจ้งเตือนก่อนเวลาเรียน")}
                    action={<Toggle label={t("แจ้งเตือนตารางเรียน")} checked={notif.schedule} onChange={(v) => setNotif({ schedule: v })} />}
                  />
                  <SettingRow
                    icon={<Megaphone className="w-5 h-5 text-amber-600" />}
                    iconBg="bg-amber-100"
                    title={t("แจ้งเตือนประกาศ")}
                    sub={t("นับประกาศที่ยังไม่อ่านที่ไอคอนกระดิ่ง")}
                    action={<Toggle label={t("แจ้งเตือนประกาศ")} checked={notif.announce} onChange={(v) => setNotif({ announce: v })} />}
                  />
                  {showMoreNotif && (
                    <>
                      <SettingRow
                        icon={<Mail className="w-5 h-5 text-sky-600" />}
                        iconBg="bg-sky-100"
                        title={t("แจ้งเตือนทางอีเมล")}
                        sub={t("ส่งสรุปไปที่ {email}", { email: profile.email })}
                        action={<Toggle label={t("แจ้งเตือนทางอีเมล")} checked={notif.email} onChange={(v) => setNotif({ email: v })} />}
                      />
                      <SettingRow
                        icon={<Volume2 className="w-5 h-5 text-rose-600" />}
                        iconBg="bg-rose-100"
                        title={t("เสียงแจ้งเตือน")}
                        sub={t("เล่นเสียงเมื่อเช็คชื่อสำเร็จ")}
                        action={<Toggle label={t("เสียงแจ้งเตือน")} checked={notif.sound} onChange={(v) => setNotif({ sound: v })} />}
                      />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreNotif((v) => !v)}
                  aria-expanded={showMoreNotif}
                  className="flex items-center justify-center gap-1.5 w-full text-sm text-blue-600 font-semibold hover:underline mt-4"
                >
                  {showMoreNotif ? t("แสดงน้อยลง") : t("จัดการการแจ้งเตือนเพิ่มเติม")}
                  <ChevronRight className={`w-4 h-4 transition-transform ${showMoreNotif ? "-rotate-90" : ""}`} />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Theme & display */}
              <div ref={refs.theme} id="settings-theme" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">{t("ธีมและการแสดงผล")}</h3>

                <div className="mb-5">
                  <div className="text-xs text-slate-500 font-medium mb-2">{t("โหมดสี")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light", icon: Sun, label: t("สว่าง") },
                      { id: "dark", icon: Moon, label: t("มืด") },
                      { id: "system", icon: Monitor, label: t("ตามระบบ") },
                    ].map(({ id, icon: Icon, label }) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => updatePrefs({ colorMode: id })}
                        aria-pressed={colorMode === id}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                          colorMode === id ? "border-blue-400 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-xs text-slate-500 font-medium mb-2">{t("ขนาดตัวอักษร")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "small", label: t("เล็ก") },
                      { id: "normal", label: t("ปกติ") },
                      { id: "large", label: t("ใหญ่") },
                    ].map(({ id, label }) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => updatePrefs({ fontSize: id })}
                        aria-pressed={fontSize === id}
                        className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                          fontSize === id ? "border-blue-400 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={refs.language} id="settings-language" className="scroll-mt-6">
                  <label htmlFor="student-language" className="block text-xs text-slate-500 font-medium mb-2">
                    {t("ภาษาของระบบ")}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      id="student-language"
                      value={LANG}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full appearance-none border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-700 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="th">{t("ภาษาไทย")}</option>
                      <option value="en">English</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{t("เปลี่ยนภาษาแล้วหน้าเว็บจะโหลดใหม่")}</p>
                </div>
              </div>

              {/* Other settings */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">{t("ตั้งค่าอื่นๆ")}</h3>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={onReset}
                    className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800">{t("ตั้งค่าเริ่มต้น")}</div>
                      <div className="text-xs text-slate-400">{t("รีเซ็ตการตั้งค่าทั้งหมด")}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteOpen((v) => !v);
                      setDeleteText("");
                    }}
                    aria-expanded={deleteOpen}
                    className="w-full flex items-center gap-3 hover:bg-red-50 rounded-xl px-2 py-2.5 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-sm font-semibold text-red-500">{t("ลบบัญชี")}</div>
                      <div className="text-xs text-slate-400">{t("ลบบัญชีและข้อมูลทั้งหมดอย่างถาวร")}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${deleteOpen ? "rotate-90" : ""}`} />
                  </button>
                  {deleteOpen && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                      <p className="text-xs text-red-600 leading-relaxed">
                        {t("การลบบัญชีไม่สามารถย้อนกลับได้ ข้อมูลการเช็คชื่อและใบหน้าจะถูกลบทั้งหมด พิมพ์คำว่า")} <b>{t("ลบบัญชี")}</b> {t("เพื่อยืนยัน")}
                      </p>
                      <input
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        placeholder={t("ลบบัญชี")}
                        aria-label={t("พิมพ์คำว่า ลบบัญชี เพื่อยืนยัน")}
                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDeleteOpen(false)} className="flex-1 text-sm text-slate-600 border border-slate-200 bg-white rounded-lg py-2">
                          {t("ยกเลิก")}
                        </button>
                        <button
                          type="button"
                          onClick={onDeleteAccount}
                          disabled={deleteText.trim() !== t("ลบบัญชี")}
                          className="flex-1 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2"
                        >
                          {t("ยืนยันลบบัญชี")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {/* Help */}
            <div ref={refs.help} id="settings-help" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">{t("ช่วยเหลือ / คำถามที่พบบ่อย")}</h3>
              <div className="divide-y divide-slate-100">
                {FAQ.map((item, i) => (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                      aria-expanded={faqOpen === i}
                      className="w-full flex items-center gap-3 py-3 text-left"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-medium text-slate-800 flex-1">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                    </button>
                    {faqOpen === i && <p className="text-sm text-slate-500 leading-relaxed pb-3 pl-7">{item.a}</p>}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link to="/face-registration" className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50">
                  {t("ไปหน้าลงทะเบียนใบหน้า")}
                </Link>
                <Link to="/checkin" className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50">
                  {t("ไปหน้าเช็คชื่อ")}
                </Link>
              </div>
            </div>

            {/* About */}
            <div ref={refs.about} id="settings-about" className="scroll-mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">{t("เกี่ยวกับระบบ")}</h3>
              <div className="divide-y divide-slate-100 text-sm">
                {[
                  [t("ชื่อระบบ"), "CS FaceAttend"],
                  [t("คำอธิบาย"), t("ระบบเช็คชื่อเข้าเรียนด้วยการสแกนใบหน้า ภาควิชาวิทยาการคอมพิวเตอร์")],
                  [t("บัญชีที่ใช้งาน"), profile.email],
                  [t("อุปกรณ์"), currentDevice()],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2.5">
                    <div className="text-slate-400 w-32 shrink-0">{label}</div>
                    <div className="text-slate-800 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function SettingRow({ icon, iconBg, title, sub, action }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-400 leading-snug">{sub}</div>
      </div>
      {action}
    </div>
  );
}
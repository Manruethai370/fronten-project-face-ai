import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ScanFace,
  History,
  UserPlus,
  BookOpen,
  CalendarDays,
  Megaphone,
  User,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  CheckCheck,
  CornerDownLeft,
  Clock,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import {
  ANNOUNCEMENTS,
  COURSES,
  TODAY_CLASSES,
  clearLoginSession,
  courseName,
  markRead,
  usePrefs,
  useProfile,
  useReadIds,
} from "./studentData";
import { t, fmtDate, fmtTime } from "./i18n";

export const studentNavItems = [
  { icon: Home, label: t("หน้าหลัก"), to: "/dashboard", keywords: t("dashboard แดชบอร์ด สรุป หน้าแรก") },
  { icon: ScanFace, label: t("เช็คชื่อ"), to: "/checkin", keywords: t("checkin สแกน ใบหน้า กล้อง") },
  { icon: History, label: t("ประวัติการเช็คชื่อ"), to: "/history", keywords: t("history ย้อนหลัง สาย ขาด ส่งออก") },
  { icon: UserPlus, label: t("ลงทะเบียนใบหน้า"), to: "/face-registration", keywords: t("face register รูป ถ่ายรูป") },
  { icon: BookOpen, label: t("วิชาเรียนของฉัน"), to: "/courses", keywords: t("courses รายวิชา") },
  { icon: CalendarDays, label: t("ตารางเรียน"), to: "/schedule", keywords: t("schedule ตาราง คาบ สัปดาห์") },
  { icon: Megaphone, label: t("ประกาศ"), to: "/announcements", keywords: t("announcement ข่าว แจ้ง") },
  { icon: User, label: t("โปรไฟล์"), to: "/profile", keywords: t("profile ข้อมูลส่วนตัว เบอร์โทร") },
  { icon: Settings, label: t("ตั้งค่า"), to: "/settings", keywords: t("settings รหัสผ่าน password ธีม ตัวอักษร ภาษา") },
];

const FONT_SIZE_PX = { small: "14px", normal: "16px", large: "18px" };

// โหมดมืด: สลับตัวแปรสีของ Tailwind v4 เฉพาะในหน้านักศึกษา (ไม่ต้องเพิ่ม dark: ทุกคลาส)
const tint = (name, rgb) =>
  `--color-${name}-50: rgb(${rgb} / 0.12); --color-${name}-100: rgb(${rgb} / 0.22); --color-${name}-200: rgb(${rgb} / 0.38);`;
const DARK_CSS = `
.student-app[data-theme="dark"] {
  color-scheme: dark;
  --color-slate-50: #020617; --color-slate-100: #1e293b; --color-slate-200: #334155;
  --color-slate-300: #475569; --color-slate-400: #94a3b8; --color-slate-500: #a8b5c8;
  --color-slate-600: #cbd5e1; --color-slate-700: #e2e8f0; --color-slate-800: #f1f5f9;
  --color-slate-900: #f8fafc;
  ${tint("blue", "37 99 235")} ${tint("emerald", "16 185 129")} ${tint("red", "239 68 68")}
  ${tint("amber", "245 158 11")} ${tint("rose", "244 63 94")} ${tint("purple", "168 85 247")}
  ${tint("sky", "14 165 233")} ${tint("green", "34 197 94")}
}
.student-app[data-theme="dark"] .bg-white { background-color: #0f172a; }
.student-app[data-theme="dark"] .text-blue-100 { color: #dbeafe; }
.student-app[data-theme="dark"] .ring-white { --tw-ring-color: #0f172a; }
.student-app[data-theme="dark"] .recharts-cartesian-grid line { stroke: #1e293b; }
.student-app[data-theme="dark"] .recharts-default-tooltip { background-color: #0f172a !important; border-color: #334155 !important; }
`;

// ปิด dropdown เมื่อคลิกนอกพื้นที่ หรือกด Esc
function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

// นำธีมและขนาดตัวอักษรจากหน้าตั้งค่ามาใช้
function useAppearance() {
  const { colorMode, fontSize } = usePrefs();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  );

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq?.addEventListener) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = FONT_SIZE_PX[fontSize] || FONT_SIZE_PX.normal;
    return () => {
      root.style.fontSize = previous;
    };
  }, [fontSize]);

  return colorMode === "system" ? systemDark : colorMode === "dark";
}

/**
 * โครงหน้าร่วมของทุกหน้านักศึกษา: เมนูซ้าย + แถบด้านบน (ค้นหา, แจ้งเตือน, เมนูผู้ใช้)
 * ใช้: <StudentLayout> ...เนื้อหาของหน้า... </StudentLayout>
 */
export default function StudentLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useProfile();
  const dark = useAppearance();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const logout = () => {
    clearLoginSession();
    navigate("/login", { replace: true });
  };

  // ปิดเมนูซ้ายหลังเลือกหน้าบนจอเล็ก
  const onNavigate = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <div className="student-app min-h-screen w-full bg-slate-50 font-sans flex" data-theme={dark ? "dark" : "light"}>
      <style>{DARK_CSS}</style>

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 bg-white border-r border-slate-100 flex flex-col transition-all overflow-hidden`}
      >
        <Link to="/dashboard" onClick={onNavigate} className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 shrink-0">
          <img src={logoImg} alt="CS FaceAttend" className="h-10 w-auto object-contain" />
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900 whitespace-nowrap">CS FaceAttend</div>
            <div className="text-[10px] text-slate-400 whitespace-nowrap">Computer Science AI Face Attendance System</div>
          </div>
        </Link>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {studentNavItems.map(({ icon: Icon, label, to }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {t("ออกจากระบบ")}
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">{t("ระบบปลอดภัย")}</div>
                <div className="text-xs text-slate-500 leading-snug mt-0.5">{t("ข้อมูลของคุณได้รับการปกป้องอย่างปลอดภัย")}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">{t("ออนไลน์")}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 shrink-0 relative z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            aria-label={t("สลับเมนู")}
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <GlobalSearch />

          <div className="flex-1 hidden sm:block" />

          <NotificationBell />

          <UserMenu profile={profile} onLogout={logout} />
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">{children}</main>

        <footer className="text-center text-xs text-slate-400 py-6">
          © 2026 Computer Science AI Face Attendance System. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ค้นหา: เมนู รายวิชา และประกาศ แล้วพาไปหน้านั้น                         */
/* ------------------------------------------------------------------ */
function GlobalSearch() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  useDismiss(ref, open, () => setOpen(false));

  const q = query.trim().toLowerCase();
  const results = [];
  if (q) {
    studentNavItems
      .filter((n) => `${n.label} ${n.keywords}`.toLowerCase().includes(q))
      .forEach((n) => results.push({ key: `p${n.to}`, group: t("เมนู"), icon: n.icon, title: n.label, to: n.to }));
    COURSES.filter((c) => `${c.code} ${c.name} ${c.nameEn} ${c.teacher}`.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) =>
        results.push({
          key: `c${c.code}`,
          group: t("รายวิชา"),
          icon: BookOpen,
          title: `${c.code} ${c.name}`,
          sub: t("{teacher} • ภาคเรียน {term}", { teacher: t(c.teacher), term: c.term }),
          to: `/courses?open=${c.code}`,
        })
      );
    ANNOUNCEMENTS.filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((a) =>
        results.push({
          key: `a${a.id}`,
          group: t("ประกาศ"),
          icon: Megaphone,
          title: a.title,
          sub: fmtDate(a.date),
          to: `/announcements?open=${a.id}`,
          announcementId: a.id,
        })
      );
  }

  const go = (r) => {
    if (!r) return;
    if (r.announcementId) markRead(r.announcementId);
    navigate(r.to);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex] || results[0]);
    }
  };

  return (
    <div ref={ref} className="relative flex-1 max-w-md min-w-0">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={t("ค้นหาเมนู รายวิชา หรือประกาศ...")}
        aria-label={t("ค้นหา")}
        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />

      {open && q && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">{t("ไม่พบผลลัพธ์สำหรับ \"{q}\"", { q: query.trim() })}</div>
          ) : (
            results.map((r, i) => {
              const Icon = r.icon;
              const showGroup = i === 0 || results[i - 1].group !== r.group;
              return (
                <div key={r.key}>
                  {showGroup && (
                    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-slate-400 tracking-wide">{r.group}</div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(r)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800 truncate">{r.title}</div>
                      {r.sub && <div className="text-xs text-slate-400 truncate">{r.sub}</div>}
                    </div>
                    {i === activeIndex && <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* กระดิ่งแจ้งเตือน: คาบที่รอเช็คชื่อ + ประกาศที่ยังไม่อ่าน                   */
/* ------------------------------------------------------------------ */
function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const { notif } = usePrefs();
  const readIds = useReadIds();
  useDismiss(ref, open, () => setOpen(false));

  const pending = notif.checkin ? TODAY_CLASSES.filter((c) => c.status === "pending") : [];
  const unread = ANNOUNCEMENTS.filter((a) => !readIds.has(a.id));
  const list = ANNOUNCEMENTS.slice(0, 6);
  const badgeCount = pending.length + (notif.announce ? unread.length : 0);

  const openItem = (a) => {
    markRead(a.id);
    setOpen(false);
    navigate(`/announcements?open=${a.id}`);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("การแจ้งเตือน") + (badgeCount ? t(" ({n} รายการใหม่)", { n: badgeCount }) : "")}
        aria-expanded={open}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-900">{t("การแจ้งเตือน")}</div>
            <button
              type="button"
              onClick={() => markRead(ANNOUNCEMENTS.map((a) => a.id))}
              disabled={unread.length === 0}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t("อ่านทั้งหมดแล้ว")}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {pending.map((c) => (
              <Link
                key={`c${c.code}`}
                to="/checkin"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100/70 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <ScanFace className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-emerald-700">{t("รอเช็คชื่อวันนี้")}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {c.code} {courseName(c.code)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtTime(`${c.time} - ${c.endTime}`)} • {t("แตะเพื่อไปหน้าเช็คชื่อ")}
                  </div>
                </div>
              </Link>
            ))}
            {list.map((a) => {
              const isUnread = !readIds.has(a.id);
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => openItem(a)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      a.pinned ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${isUnread ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                      {a.title}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-1">{a.body}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {fmtDate(a.date)} • {a.teacher}
                    </div>
                  </div>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          <Link
            to="/announcements"
            onClick={() => setOpen(false)}
            className="block text-center text-sm font-semibold text-blue-600 hover:bg-slate-50 py-3 border-t border-slate-100"
          >
            {t("ดูประกาศทั้งหมด")}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* เมนูผู้ใช้ (มุมขวาบน)                                               */
/* ------------------------------------------------------------------ */
function UserMenu({ profile, onLogout }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useDismiss(ref, open, () => setOpen(false));

  const items = [
    { icon: User, label: t("โปรไฟล์"), to: "/profile" },
    { icon: Settings, label: t("ตั้งค่า"), to: "/settings" },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("เมนูผู้ใช้")}
        className="flex items-center gap-2.5 pl-1 sm:pl-2 rounded-xl hover:bg-slate-50 transition-colors"
      >
        <img src={profile.avatar} alt={profile.fullName} className="w-10 h-10 rounded-full object-cover" />
        <div className="text-left hidden sm:block">
          <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">{profile.fullName}</div>
          <div className="text-xs text-slate-400 whitespace-nowrap">{t("นักศึกษา")}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden py-1">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900 truncate">{profile.fullName}</div>
            <div className="text-xs text-slate-400 truncate">{profile.email}</div>
          </div>
          {items.map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100"
          >
            <LogOut className="w-4 h-4" />
            {t("ออกจากระบบ")}
          </button>
        </div>
      )}
    </div>
  );
}
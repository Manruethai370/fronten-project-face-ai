import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  User,
  CheckCircle2,
  BarChart3,
  Code2,
  Database,
  Cpu,
  Brain,
  MapPin,
  MoreHorizontal,
  Info,
  History,
  Megaphone,
  ScanFace,
  GraduationCap,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { COURSES, useStudentData } from "./studentData";
import { t } from "./i18n";

const colorMap = {
  blue: { border: "border-l-blue-500", iconBg: "bg-blue-100", iconText: "text-blue-600", codeText: "text-blue-600", btn: "bg-blue-50 text-blue-600 hover:bg-blue-100", bar: "bg-blue-500" },
  amber: { border: "border-l-amber-500", iconBg: "bg-amber-100", iconText: "text-amber-600", codeText: "text-amber-600", btn: "bg-amber-50 text-amber-600 hover:bg-amber-100", bar: "bg-amber-500" },
  emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-100", iconText: "text-emerald-600", codeText: "text-emerald-600", btn: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100", bar: "bg-emerald-500" },
  purple: { border: "border-l-purple-500", iconBg: "bg-purple-100", iconText: "text-purple-600", codeText: "text-purple-600", btn: "bg-purple-50 text-purple-600 hover:bg-purple-100", bar: "bg-purple-500" },
  sky: { border: "border-l-sky-500", iconBg: "bg-sky-100", iconText: "text-sky-600", codeText: "text-sky-600", btn: "bg-sky-50 text-sky-600 hover:bg-sky-100", bar: "bg-sky-500" },
  rose: { border: "border-l-rose-500", iconBg: "bg-rose-100", iconText: "text-rose-600", codeText: "text-rose-600", btn: "bg-rose-50 text-rose-600 hover:bg-rose-100", bar: "bg-rose-500" },
};
const COLORS = ["blue", "amber", "emerald", "purple", "sky", "rose"];
const ICONS = { "CS-201": Code2, "CS-203": Database, "CS-204": Cpu, "CS-205": Brain, "GE-101": BarChart3, "CS-101": Code2, "MA-102": GraduationCap };

// ?open=<รหัสวิชา> (จากช่องค้นหา/หน้าอื่น) = เปิดรายละเอียดวิชานั้นทันที
export default function MyCourses() {
  const [params] = useSearchParams();
  const openParam = params.get("open") || "";
  return <MyCoursesPage key={openParam} focusCode={openParam || null} />;
}

function MyCoursesPage({ focusCode }) {
  useStudentData();
  const terms = [...new Set(COURSES.map((course) => course.term).filter(Boolean))];
  const focusTerm = COURSES.find((c) => c.code === focusCode)?.term;
  const [term, setTerm] = useState(focusTerm || "");
  const [status, setStatus] = useState("");
  const [openCode, setOpenCode] = useState(focusCode);
  const [menuCode, setMenuCode] = useState(null);

  const activeTerm = focusTerm || (terms.includes(term) ? term : terms[0] || "");
  const courses = COURSES.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length], icon: ICONS[c.code] })).filter(
    (c) => c.term === activeTerm && (!status || c.status === status)
  );
  const totalAttended = courses.reduce((s, c) => s + c.attended, 0);
  const totalSessions = courses.reduce((s, c) => s + c.total, 0);
  const avg = totalSessions ? ((totalAttended / totalSessions) * 100).toFixed(1) : "0.0";
  const fullAttendance = courses.filter((c) => c.absent === 0).length;

  useEffect(() => {
    if (!focusCode) return;
    document.getElementById(`course-${focusCode}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusCode]);

  return (
    <StudentLayout>
      {/* Title + filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            {t("วิชาเรียนของฉัน")}
            <BookOpen className="w-5 h-5 text-slate-400" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("ภาคเรียนที่ {term}", { term })}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeTerm}
            onChange={(e) => setTerm(e.target.value)}
            aria-label={t("ภาคเรียน")}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            {terms.map((tm) => (
              <option key={tm} value={tm}>
                {t("ภาคเรียน {term}", { term: tm })}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label={t("สถานะรายวิชา")}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="">{t("ทั้งหมด")}</option>
            <option value="studying">{t("กำลังเรียน")}</option>
            <option value="finished">{t("เรียนจบแล้ว")}</option>
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={<BookOpen className="w-6 h-6 text-blue-600" />} iconBg="bg-blue-100" label={t("รายวิชาทั้งหมด")} value={courses.length} sub={t("วิชา")} />
        <StatCard icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} iconBg="bg-emerald-100" label={t("เช็คชื่อครบ (ไม่ขาด)")} value={fullAttendance} sub={t("วิชา")} />
        <StatCard icon={<BarChart3 className="w-6 h-6 text-purple-600" />} iconBg="bg-purple-100" label={t("อัตราเข้าเรียนเฉลี่ย")} value={`${avg}%`} sub={t("ของทั้งหมด")} />
      </div>

      {/* Course cards */}
      {courses.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">{t("ไม่มีรายวิชาตามเงื่อนไขที่เลือก")}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
        {courses.map((c) => {
          const cs = colorMap[c.color];
          const pct = Math.round((c.attended / c.total) * 100);
          const Icon = c.icon || BookOpen;
          const isOpen = openCode === c.code;
          return (
            <div
              key={c.code}
              id={`course-${c.code}`}
              className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${cs.border} shadow-sm p-5 flex flex-col scroll-mt-6 ${
                focusCode === c.code ? "ring-2 ring-blue-200" : ""
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cs.iconBg}`}>
                  {c.code === "CS-202" ? (
                    <span className={`text-xs font-extrabold ${cs.iconText}`}>OOP</span>
                  ) : (
                    <Icon className={`w-5 h-5 ${cs.iconText}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`font-bold text-sm ${cs.codeText}`}>{c.code}</div>
                  <div className="text-sm font-semibold text-slate-800 leading-snug">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.nameEn}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {c.teacher}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {c.schedule}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {c.room}
                </span>
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">
                    {t("เข้าเรียน {n} / {total} ครั้ง", { n: c.attended, total: c.total })}
                  </span>
                  <span className={`font-semibold ${cs.codeText}`}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${pct}%` }} />
                </div>

                {isOpen && (
                  <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs space-y-1.5">
                    <Row label={t("หน่วยกิต")} value={t("{n} หน่วยกิต", { n: c.credit })} />
                    <Row label={t("ภาคเรียน")} value={c.term} />
                    <Row label={t("สถานะ")} value={c.status === "studying" ? t("กำลังเรียน") : t("เรียนจบแล้ว")} />
                    <Row label={t("ตรงเวลา")} value={t("{n} ครั้ง", { n: c.attended - c.late })} />
                    <Row label={t("สาย")} value={t("{n} ครั้ง", { n: c.late })} />
                    <Row label={t("ขาดเรียน")} value={t("{n} ครั้ง", { n: c.absent })} />
                    <Link to={`/history?course=${c.code}`} className="block text-blue-600 font-semibold hover:underline pt-1">
                      {t("ดูประวัติการเช็คชื่อของวิชานี้ →")}
                    </Link>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenCode(isOpen ? null : c.code)}
                    aria-expanded={isOpen}
                    className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${cs.btn}`}
                  >
                    {isOpen ? t("ซ่อนรายละเอียด") : t("ดูรายละเอียด")}
                  </button>
                  <MoreMenu code={c.code} open={menuCode === c.code} setOpen={(v) => setMenuCode(v ? c.code : null)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
        <Info className="w-3.5 h-3.5" />
        {t("คลิกที่ \"ดูรายละเอียด\" เพื่อดูข้อมูลเพิ่มเติมของรายวิชา")}
      </div>
    </StudentLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}

// เมนู "..." ของแต่ละวิชา
function MoreMenu({ code, open, setOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const items = [
    { icon: ScanFace, label: t("เช็คชื่อ"), to: "/checkin" },
    { icon: History, label: t("ประวัติการเช็คชื่อ"), to: `/history?course=${code}` },
    { icon: CalendarDays, label: t("ดูในตารางเรียน"), to: "/schedule" },
    { icon: Megaphone, label: t("ประกาศของวิชา"), to: "/announcements" },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("ตัวเลือกเพิ่มเติมของ {code}", { code })}
        aria-expanded={open}
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-xl border border-slate-100 shadow-xl py-1 z-20">
          {items.map(({ icon: Icon, label, to }) => (
            <Link key={label} to={to} className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
        <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
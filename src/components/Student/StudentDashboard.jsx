import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardCheck,
  CalendarCheck,
  Percent,
  Trophy,
  Clock,
  CheckCircle2,
  Megaphone,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import StudentLayout from "./StudentLayout";
import { ANNOUNCEMENTS, TODAY_CLASSES, COURSES, markRead, useProfile } from "./studentData";
import { t, LOCALE, fmtTime } from "./i18n";

const recentCheckins = [
  { subject: t("โครงสร้างข้อมูลและอัลกอริทึม"), date: t("20 พ.ค. 2567"), time: t("08:05 น."), status: "ontime" },
  { subject: t("การเขียนโปรแกรมเชิงวัตถุ"), date: t("20 พ.ค. 2567"), time: t("10:20 น."), status: "ontime" },
  { subject: t("ฐานข้อมูล"), date: t("19 พ.ค. 2567"), time: t("13:40 น."), status: "late", lateBy: t("สาย 10 นาที") },
  { subject: t("ระบบปฏิบัติการ"), date: t("19 พ.ค. 2567"), time: t("09:05 น."), status: "ontime" },
];

// ข้อมูลตัวอย่างของกราฟ แยกตามช่วงเวลาที่เลือก
const PERIODS = {
  thisMonth: {
    label: t("เดือนนี้"),
    trend: [
      { day: t("1 พ.ค."), rate: 70 },
      { day: t("5 พ.ค."), rate: 78 },
      { day: t("10 พ.ค."), rate: 74 },
      { day: t("15 พ.ค."), rate: 85 },
      { day: t("20 พ.ค."), rate: 80 },
      { day: t("25 พ.ค."), rate: 88 },
      { day: t("30 พ.ค."), rate: 92.5 },
    ],
    summary: [20, 3, 1],
  },
  lastMonth: {
    label: t("เดือนที่แล้ว"),
    trend: [
      { day: t("1 เม.ย."), rate: 82 },
      { day: t("5 เม.ย."), rate: 86 },
      { day: t("10 เม.ย."), rate: 90 },
      { day: t("15 เม.ย."), rate: 84 },
      { day: t("20 เม.ย."), rate: 88 },
      { day: t("25 เม.ย."), rate: 91 },
      { day: t("30 เม.ย."), rate: 89 },
    ],
    summary: [22, 2, 2],
  },
  term: {
    label: t("ทั้งภาคเรียน"),
    trend: [
      { day: t("ม.ค."), rate: 88 },
      { day: t("ก.พ."), rate: 90 },
      { day: t("มี.ค."), rate: 86 },
      { day: t("เม.ย."), rate: 89 },
      { day: t("พ.ค."), rate: 92.5 },
    ],
    summary: [101, 9, 4],
  },
};
const SUMMARY_META = [
  { name: t("ตรงเวลา"), color: "#22c55e" },
  { name: t("สาย"), color: "#f59e0b" },
  { name: t("ขาด"), color: "#ef4444" },
];

function greeting(hour) {
  if (hour < 12) return t("สวัสดีตอนเช้า");
  if (hour < 17) return t("สวัสดีตอนบ่าย");
  return t("สวัสดีตอนเย็น");
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [now, setNow] = useState(new Date());
  const [period, setPeriod] = useState("thisMonth");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const todayClasses = TODAY_CLASSES.map((c) => {
    const course = COURSES.find((x) => x.code === c.code);
    return { ...c, subject: course?.name || c.code, teacher: course?.teacher || "-" };
  });
  const checkedToday = todayClasses.filter((c) => c.status === "checked").length;

  const attendanceTrend = PERIODS[period].trend;
  const attendanceSummary = SUMMARY_META.map((m, i) => ({ ...m, value: PERIODS[period].summary[i] }));
  const summaryTotal = attendanceSummary.reduce((a, b) => a + b.value, 0);

  const announcements = ANNOUNCEMENTS.slice(0, 2);
  const openAnnouncement = (a) => {
    markRead(a.id);
    navigate(`/announcements?open=${a.id}`);
  };

  return (
    <StudentLayout>
      {/* Greeting + date card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting(now.getHours())} <span className="inline-block">👋</span>
          </h1>
          <h2 className="text-2xl font-extrabold text-blue-600 mt-1">{profile.fullName}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {t(profile.faculty)} • {t("รหัสนักศึกษา {code}", { code: profile.studentCode })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl px-6 py-4 text-white shadow-lg shadow-blue-200 shrink-0 w-full lg:w-72">
          <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>{t("วัน")}{now.toLocaleDateString(LOCALE, { weekday: "long" })}</span>
          </div>
          <div className="text-sm text-blue-100 mb-2">
            {now.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="text-2xl font-bold tracking-wide">{timeStr}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          to="/checkin"
          icon={<ClipboardCheck className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label={t("เช็คชื่อวันนี้")}
          value={checkedToday}
          unit={t("/{n} วิชา", { n: todayClasses.length })}
          sub={t("{pct}% ของวันนี้", { pct: ((checkedToday / todayClasses.length) * 100).toFixed(1) })}
          progress={(checkedToday / todayClasses.length) * 100}
          barColor="bg-emerald-500"
        />
        <StatCard
          to="/history"
          icon={<CalendarCheck className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
          label={t("เช็คชื่อทั้งหมด")}
          value="24"
          unit={t("ครั้ง")}
          sub={t("เดือนนี้")}
          sparkline={PERIODS.thisMonth.trend}
        />
        <StatCard
          to="/history"
          icon={<Percent className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-100"
          label={t("อัตราการเข้าเรียน")}
          value="92.5"
          unit="%"
          sub={t("เดือนนี้")}
          progress={92.5}
          barColor="bg-purple-500"
        />
        <StatCard
          to="/courses"
          icon={<Trophy className="w-6 h-6 text-amber-500" />}
          iconBg="bg-amber-100"
          label={t("อันดับในชั้นเรียน")}
          value="5"
          unit="/45"
          sub={t("จากทั้งหมด")}
          progress={(1 - 5 / 45) * 100}
          barColor="bg-amber-500"
        />
      </div>

      {/* Today's classes + recent check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{t("วิชาเรียนวันนี้")}</h3>
            <Link to="/schedule" className="text-sm text-blue-600 font-medium hover:underline">
              {t("ดูทั้งหมด")}
            </Link>
          </div>

          <div className="space-y-3">
            {todayClasses.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="shrink-0 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg px-3 py-2 text-center leading-tight">
                  <div>{c.time}</div>
                  <div className="text-blue-400">-</div>
                  <div>{c.endTime}</div>
                </div>
                <Link to={`/courses?open=${c.code}`} className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 text-sm truncate hover:text-blue-600">{c.subject}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{c.teacher}</div>
                </Link>
                {c.status === "checked" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-600">{t("เช็คชื่อแล้ว")}</div>
                      <div className="text-[11px] text-slate-400">{fmtTime(c.checkedAt)}</div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                ) : (
                  <Link to="/checkin" className="flex items-center gap-2 shrink-0 group">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      {t("เช็คชื่อเลย")}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4 bg-blue-50 text-blue-600 text-xs rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {t("กรุณาเช็คชื่อภายในเวลา 15 นาทีหลังจากเริ่มคาบเรียน")}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{t("การเช็คชื่อล่าสุด")}</h3>
            <Link to="/history" className="text-sm text-blue-600 font-medium hover:underline">
              {t("ดูทั้งหมด")}
            </Link>
          </div>

          <div className="space-y-4">
            {recentCheckins.map((r, i) => (
              <Link to="/history" key={i} className="flex items-center gap-3 rounded-xl -mx-2 px-2 py-1 hover:bg-slate-50">
                <img src={profile.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{r.subject}</div>
                  <div className="text-xs text-slate-400">
                    {r.date} • {r.time}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ${
                    r.status === "ontime" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {r.status === "ontime" ? t("ตรงเวลา") : r.lateBy}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Charts + announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1.1fr] gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-slate-900">{t("สถิติการเข้าเรียน ({period})", { period: PERIODS[period].label })}</h3>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label={t("เลือกช่วงเวลา")}
              className="text-xs font-medium text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {Object.entries(PERIODS).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, t("อัตราเข้าเรียน")]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#2563eb" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">{t("สรุปการเข้าเรียน ({period})", { period: PERIODS[period].label })}</h3>
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attendanceSummary} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={3} stroke="none">
                  {attendanceSummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-900">{summaryTotal}</div>
              <div className="text-xs text-slate-400">{t("ครั้ง")}</div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {attendanceSummary.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600">{s.name}</span>
                </div>
                <span className="text-slate-800 font-medium">
                  {s.value} ({((s.value / summaryTotal) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">{t("ประกาศจากอาจารย์")}</h3>
            <Link to="/announcements" className="text-sm text-blue-600 font-medium hover:underline">
              {t("ดูทั้งหมด")}
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.map((a) => {
              const warn = a.pinned;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openAnnouncement(a)}
                  className={`w-full flex items-start gap-3 text-left rounded-xl p-4 transition-colors ${
                    warn ? "bg-amber-50 hover:bg-amber-100/70" : "bg-blue-50 hover:bg-blue-100/70"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      warn ? "bg-amber-500" : "bg-blue-600"
                    }`}
                  >
                    {warn ? <AlertTriangle className="w-4 h-4 text-white" /> : <Megaphone className="w-4 h-4 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold mb-0.5 ${warn ? "text-amber-600" : "text-blue-600"}`}>{a.title}</div>
                    <div className="text-xs text-slate-500 leading-relaxed line-clamp-3">{a.body}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function StatCard({ to, icon, iconBg, label, value, unit, sub, progress, barColor, sparkline }) {
  return (
    <Link to={to} className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <div className="text-sm text-slate-500 font-medium">{label}</div>
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mb-3">{sub}</div>
      {typeof progress === "number" && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {sparkline && (
        <div className="h-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Link>
  );
}
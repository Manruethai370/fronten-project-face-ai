import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ScanFace,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Calendar,
  RotateCcw,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import ThaiDatePicker from "./ThaiDatePicker";
import { COURSES, courseName, downloadCsv, useStudentData } from "./studentData";
import { t, LOCALE } from "./i18n";

const PAGE_SIZE = 8;
const TODAY = new Date().toISOString().slice(0, 10);

const thaiDate = (iso, month = "short") =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE, { day: "2-digit", month, year: "numeric" });

const statusMeta = {
  ontime: { label: t("เข้าเรียน"), cls: "bg-emerald-100 text-emerald-600", icon: CheckCircle2 },
  late: { label: t("สาย"), cls: "bg-amber-100 text-amber-600", icon: Clock },
  absent: { label: t("ขาดเรียน"), cls: "bg-red-100 text-red-600", icon: XCircle },
};

export default function CheckinHistory() {
  const { checkins } = useStudentData();
  const [params] = useSearchParams();
  const [course, setCourse] = useState(params.get("course") || "");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const courseCodes = [...new Set(checkins.map((r) => r.code))];
  const latestDate = checkins[0]?.iso || TODAY;
  const records = checkins.filter(
    (r) =>
      (!course || r.code === course) &&
      (!status || r.status === status) &&
      (!dateFrom || r.iso >= dateFrom) &&
      (!dateTo || r.iso <= dateTo)
  );
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = records.slice(start, start + PAGE_SIZE);

  const count = (s) => records.filter((r) => r.status === s).length;
  const pct = (n) => (records.length ? `${((n / records.length) * 100).toFixed(2)}%` : "0%");
  const todayCount = checkins.filter((r) => r.iso === TODAY && r.status !== "absent").length;

  const withReset = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };
  const resetFilters = () => {
    setCourse("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  const hasFilter = course || status || dateFrom || dateTo;

  const exportCsv = () => {
    downloadCsv(
      `checkin-history-${new Date().toISOString().slice(0, 10)}.csv`,
      [t("วันที่"), t("เวลา"), t("รหัสวิชา"), t("รายวิชา"), t("ห้องเรียน"), t("สถานะ"), t("วิธีเช็คชื่อ")],
      records.map((r) => [thaiDate(r.iso), r.time, r.code, courseName(r.code), r.room, statusMeta[r.status].label, r.method])
    );
  };

  return (
    <StudentLayout>
      {/* Title + breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ประวัติการเช็คชื่อ")}</h1>
        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
          <Link to="/dashboard" className="hover:text-blue-600">
            {t("หน้าหลัก")}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-500">{t("ประวัติการเช็คชื่อ")}</span>
        </div>
      </div>

      {/* Stat cards — คลิกเพื่อกรองสถานะ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          active={!status}
          onClick={() => withReset(setStatus)({ target: { value: "" } })}
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
          label={t("เช็คชื่อทั้งหมด")}
          value={records.length}
          unit={t("ครั้ง")}
        />
        <StatCard
          active={status === "ontime"}
          onClick={() => withReset(setStatus)({ target: { value: "ontime" } })}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label={t("เข้าเรียน")}
          value={count("ontime")}
          sub={pct(count("ontime"))}
          subColor="text-emerald-600"
        />
        <StatCard
          active={status === "late"}
          onClick={() => withReset(setStatus)({ target: { value: "late" } })}
          icon={<Clock className="w-6 h-6 text-amber-500" />}
          iconBg="bg-amber-100"
          label={t("สาย")}
          value={count("late")}
          sub={pct(count("late"))}
          subColor="text-amber-500"
        />
        <StatCard
          active={status === "absent"}
          onClick={() => withReset(setStatus)({ target: { value: "absent" } })}
          icon={<XCircle className="w-6 h-6 text-red-500" />}
          iconBg="bg-red-100"
          label={t("ขาดเรียน")}
          value={count("absent")}
          sub={pct(count("absent"))}
          subColor="text-red-500"
        />
        <StatCard
          active={dateFrom === TODAY && dateTo === TODAY}
          onClick={() => {
            setDateFrom(TODAY);
            setDateTo(TODAY);
            setPage(1);
          }}
          icon={<CalendarClock className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-100"
          label={t("เช็คชื่อวันนี้")}
          value={todayCount}
          unit={t("ครั้ง")}
        />
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center flex-wrap gap-3 p-5 border-b border-slate-100">
          <select
            value={course}
            onChange={withReset(setCourse)}
            aria-label={t("รายวิชา")}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">{t("ทุกรายวิชา")}</option>
            {courseCodes.map((c) => (
              <option key={c} value={c}>
                {c} {courseName(c)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 bg-white">
            <ThaiDatePicker
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(v) => withReset(setDateFrom)({ target: { value: v } })}
              placeholder={t("ตั้งแต่วันที่")}
              ariaLabel={t("ตั้งแต่วันที่")}
              defaultMonth={dateTo || latestDate}
            />
            <span className="text-slate-400">-</span>
            <ThaiDatePicker
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(v) => withReset(setDateTo)({ target: { value: v } })}
              placeholder={t("ถึงวันที่")}
              ariaLabel={t("ถึงวันที่")}
              defaultMonth={dateFrom || latestDate}
            />
          </div>

          <select
            value={status}
            onChange={withReset(setStatus)}
            aria-label={t("สถานะ")}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">{t("สถานะทั้งหมด")}</option>
            <option value="ontime">{t("เข้าเรียน")}</option>
            <option value="late">{t("สาย")}</option>
            <option value="absent">{t("ขาดเรียน")}</option>
          </select>

          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 px-2 py-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t("ล้างตัวกรอง")}
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={exportCsv}
            disabled={!records.length}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200"
          >
            <Download className="w-4 h-4" />
            {t("ส่งออกข้อมูล (CSV)")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-3 px-5 font-medium">{t("วันที่")}</th>
                <th className="py-3 px-3 font-medium">{t("เวลา")}</th>
                <th className="py-3 px-3 font-medium">{t("รายวิชา")}</th>
                <th className="py-3 px-3 font-medium">{t("ห้องเรียน")}</th>
                <th className="py-3 px-3 font-medium">{t("สถานะ")}</th>
                <th className="py-3 px-3 font-medium">{t("วิธีเช็คชื่อ")}</th>
                <th className="py-3 px-5 font-medium">{t("รายละเอียด")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {t("ไม่พบข้อมูลที่ตรงกับตัวกรอง")}
                  </td>
                </tr>
              )}
              {pageRecords.map((r) => {
                const meta = statusMeta[r.status];
                const StatusIcon = meta.icon;
                const isOpen = openId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-4 px-5 text-slate-600 whitespace-nowrap">{thaiDate(r.iso)}</td>
                      <td className="py-4 px-3 text-slate-600 whitespace-nowrap">{r.time}</td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <Link to={`/courses?open=${r.code}`} className="font-semibold text-slate-800 hover:text-blue-600">
                          {r.code}
                        </Link>
                        <div className="text-xs text-slate-400">{courseName(r.code)}</div>
                      </td>
                      <td className="py-4 px-3 text-slate-600 whitespace-nowrap">{r.room}</td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${meta.cls}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs">
                          {r.method === t("สแกนใบหน้า") && <ScanFace className="w-4 h-4 text-blue-500" />}
                          {r.method}
                        </span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : r.id)}
                          aria-expanded={isOpen}
                          className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold hover:underline"
                        >
                          {isOpen ? t("ซ่อนรายละเอียด") : t("ดูรายละเอียด")}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <Detail label={t("วันที่")} value={thaiDate(r.iso, "long")} />
                            <Detail label={t("อาจารย์ผู้สอน")} value={COURSES.find((c) => c.code === r.code)?.teacher || "-"} />
                            <Detail label={t("ความมั่นใจของการจดจำใบหน้า")} value={r.confidence ? `${r.confidence}%` : "-"} />
                            <Detail
                              label={t("หมายเหตุ")}
                              value={
                                r.status === "late"
                                  ? t("เช็คชื่อหลังเวลาที่กำหนด")
                                  : r.status === "absent"
                                  ? t("ไม่ได้เช็คชื่อภายในเวลา หากผิดพลาดกรุณาติดต่ออาจารย์")
                                  : t("เช็คชื่อตรงเวลา")
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4">
          <div className="text-xs text-slate-400">
            {records.length
              ? t("แสดง {from} - {to} จาก {total} รายการ", { from: start + 1, to: Math.min(start + PAGE_SIZE, records.length), total: records.length })
              : t("ไม่มีรายการ")}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label={t("หน้าก่อนหน้า")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  currentPage === i + 1 ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label={t("หน้าถัดไป")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="text-slate-700 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, unit, sub, subColor, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 transition-colors ${
        active ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-100 hover:border-slate-200"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-2xl font-bold text-slate-900 leading-tight">{value}</span>
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
        {sub && <div className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</div>}
      </div>
    </button>
  );
}
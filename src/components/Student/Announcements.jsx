import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Megaphone,
  Search,
  ChevronLeft,
  ChevronRight,
  Pin,
  BookMarked,
  Monitor,
  FileText,
  GraduationCap,
  ClipboardList,
  Sparkles,
  Layers,
  CheckCheck,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { ANNOUNCEMENTS, CATEGORY_LABEL, COURSES, markRead, useReadIds } from "./studentData";
import { t, fmtDate, fmtTime } from "./i18n";

const PAGE_SIZE = 5;

const colorMap = {
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
};

const ICONS = { megaphone: Megaphone, layers: Layers, book: BookMarked, monitor: Monitor, calendar: CalendarDays, file: FileText };

const CATEGORY_ICONS = { teaching: GraduationCap, exam: ClipboardList, activity: Sparkles, general: FileText };

const subjectOf = (code) => {
  const c = COURSES.find((x) => x.code === code);
  return c ? `${c.name} (${c.code})` : t("ประกาศทั่วไป");
};

// ?open=<id> (จากกระดิ่ง/ช่องค้นหา/แดชบอร์ด) = เปิดประกาศนั้นทันที
export default function Announcements() {
  const [params] = useSearchParams();
  const openParam = params.get("open") || "";
  return <AnnouncementsPage key={openParam} focusId={Number(openParam) || null} />;
}

function AnnouncementsPage({ focusId }) {
  const readIds = useReadIds();
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState(focusId);
  const [page, setPage] = useState(null); // null = หน้าที่มีประกาศที่ถูกเปิด (หรือหน้า 1)

  const all = ANNOUNCEMENTS.map((a) => ({ ...a, read: readIds.has(a.id), subject: subjectOf(a.course) }));
  const q = search.trim().toLowerCase();
  const filtered = all.filter(
    (a) =>
      (!q || `${a.title} ${a.body} ${a.teacher}`.toLowerCase().includes(q)) &&
      (!readFilter || (readFilter === "read") === a.read) &&
      (!courseFilter || (a.course || "general") === courseFilter) &&
      (!category || a.category === category)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const focusIndex = focusId ? filtered.findIndex((a) => a.id === focusId) : -1;
  const currentPage = Math.min(page ?? (focusIndex >= 0 ? Math.floor(focusIndex / PAGE_SIZE) + 1 : 1), totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pinnedList = all.filter((a) => a.pinned);
  const courseOptions = [...new Set(ANNOUNCEMENTS.map((a) => a.course).filter(Boolean))];

  // เลื่อนไปยังประกาศที่ถูกเปิดจากหน้าอื่น
  useEffect(() => {
    if (!focusId) return;
    markRead(focusId);
    document.getElementById(`announcement-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  const withReset = (fn) => (v) => {
    fn(v);
    setPage(1);
  };
  const toggle = (a) => {
    setExpanded(expanded === a.id ? null : a.id);
    markRead(a.id);
  };
  const openPinned = (a) => {
    setSearch("");
    setReadFilter("");
    setCourseFilter("");
    setCategory("");
    const idx = all.findIndex((x) => x.id === a.id);
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
    setExpanded(a.id);
    markRead(a.id);
    setTimeout(() => document.getElementById(`announcement-${a.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const clearFilters = () => {
    setSearch("");
    setReadFilter("");
    setCourseFilter("");
    setCategory("");
    setPage(1);
  };
  const hasFilter = search || readFilter || courseFilter || category;

  return (
    <StudentLayout>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            {t("ประกาศ")}
            <Megaphone className="w-5 h-5 text-slate-400" />
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("ติดตามข่าวสารและข้อมูลจากอาจารย์ผู้สอน")}</p>
        </div>
        <button
          type="button"
          onClick={() => markRead(ANNOUNCEMENTS.map((a) => a.id))}
          disabled={all.every((a) => a.read)}
          className="flex items-center gap-1.5 self-start sm:self-auto text-sm font-semibold text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          {t("อ่านทั้งหมดแล้ว")}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5 items-start">
        {/* Left column */}
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => withReset(setSearch)(e.target.value)}
                placeholder={t("ค้นหาประกาศ...")}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <select
              value={readFilter}
              onChange={(e) => withReset(setReadFilter)(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="">{t("ทั้งหมด")}</option>
              <option value="unread">{t("ยังไม่อ่าน")}</option>
              <option value="read">{t("อ่านแล้ว")}</option>
            </select>
            <select
              value={courseFilter}
              onChange={(e) => withReset(setCourseFilter)(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            >
              <option value="">{t("ทุกรายวิชา")}</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="general">{t("ประกาศทั่วไป")}</option>
            </select>
          </div>

          {hasFilter && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {t("พบ {n} ประกาศ", { n: filtered.length })}
                {category ? t(" ในหมวด \"{cat}\"", { cat: t(CATEGORY_LABEL[category]) }) : ""}
              </span>
              <button type="button" onClick={clearFilters} className="font-semibold text-blue-600 hover:underline">
                {t("ล้างตัวกรอง")}
              </button>
            </div>
          )}

          {/* Announcement list */}
          <div className="space-y-4">
            {pageItems.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                {t("ไม่พบประกาศที่ตรงกับเงื่อนไข")}
              </div>
            )}
            {pageItems.map((a) => {
              const cs = colorMap[a.color];
              const Icon = ICONS[a.icon] || FileText;
              const isOpen = expanded === a.id;
              return (
                <div
                  key={a.id}
                  id={`announcement-${a.id}`}
                  className={`rounded-2xl border shadow-sm p-5 scroll-mt-6 ${
                    a.pinned ? "bg-rose-50/60 border-rose-100" : "bg-white border-slate-100"
                  } ${focusId === a.id ? "ring-2 ring-blue-200" : ""}`}
                >
                  {a.pinned && (
                    <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-2">
                      <Pin className="w-3.5 h-3.5" />
                      {t("ประกาศสำคัญ")}
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cs.bg}`}>
                      <Icon className={`w-5 h-5 ${cs.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 leading-snug">{a.title}</h3>
                        <button
                          type="button"
                          onClick={() => markRead(a.id)}
                          disabled={a.read}
                          title={a.read ? "" : t("ทำเครื่องหมายว่าอ่านแล้ว")}
                          className={`text-xs font-semibold shrink-0 text-left ${
                            a.read ? "text-emerald-600 cursor-default" : "text-rose-500 hover:underline"
                          }`}
                        >
                          {a.read ? t("อ่านแล้ว") : t("ยังไม่อ่าน")}
                        </button>
                      </div>
                      <p className={`text-sm text-slate-500 leading-relaxed mt-1 whitespace-pre-line ${isOpen ? "" : "line-clamp-2"}`}>
                        {a.body}
                      </p>
                      {isOpen && (
                        <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                          {t("หมวดหมู่: {cat} • รายวิชา: {subject}", { cat: t(CATEGORY_LABEL[a.category]), subject: a.subject })}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {a.teacher.replace(/^(ผศ\.|รศ\.|อ\.|ดร\.|Asst\. Prof\.|Assoc\. Prof\.|Dr\.|Aj\.)\s*/g, "").charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">{a.teacher}</div>
                            <div className="text-[11px] text-slate-400 truncate">{a.subject}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {fmtDate(a.date)} {fmtTime(a.time)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggle(a)}
                            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                              a.pinned
                                ? "border-rose-300 text-rose-600 hover:bg-rose-100"
                                : "border-blue-200 text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            {isOpen ? t("ย่อ") : t("อ่านเพิ่มเติม")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
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
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">{t("สรุปประกาศ")}</h3>
            <div className="divide-y divide-slate-100">
              <SummaryRow label={t("ทั้งหมด")} value={all.length} onClick={clearFilters} />
              <SummaryRow
                label={t("ยังไม่อ่าน")}
                value={all.filter((a) => !a.read).length}
                valueColor="text-rose-500"
                onClick={() => {
                  clearFilters();
                  setReadFilter("unread");
                }}
              />
              <SummaryRow label={t("ประกาศสำคัญ")} value={pinnedList.length} valueColor="text-rose-500" onClick={() => openPinned(pinnedList[0])} />
              <SummaryRow
                label={t("ประกาศทั่วไป")}
                value={all.filter((a) => !a.course).length}
                onClick={() => {
                  clearFilters();
                  setCourseFilter("general");
                }}
              />
            </div>
          </div>

          {/* Pinned */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Pin className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-slate-900">{t("ประกาศปักหมุด")}</h3>
            </div>
            <div className="space-y-3">
              {pinnedList.map((p) => {
                const Icon = ICONS[p.icon] || Megaphone;
                return (
                  <div key={p.id} className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {t("สำคัญ")}
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {fmtDate(p.date)} {fmtTime(p.time)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openPinned(p)}
                      className="text-xs font-semibold text-rose-600 hover:underline mt-2 flex items-center gap-1"
                    >
                      {t("อ่านเพิ่มเติม")}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">{t("หมวดหมู่ประกาศ")}</h3>
            <div className="space-y-1">
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => {
                const Icon = CATEGORY_ICONS[key];
                const active = category === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => withReset(setCategory)(active ? "" : key)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${
                      active ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className={`text-sm flex-1 text-left ${active ? "text-blue-600 font-semibold" : "text-slate-700"}`}>{label}</span>
                    <span className="text-sm font-semibold text-slate-800">{all.filter((a) => a.category === key).length}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

function SummaryRow({ label, value, valueColor, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between py-2.5 text-sm hover:bg-slate-50 rounded-lg px-1 -mx-1">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${valueColor || "text-slate-900"}`}>{value}</span>
    </button>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarRange, List, Info, CheckCircle2, MapPin, ScanFace } from "lucide-react";
import StudentLayout from "./StudentLayout";
import { t, fmtTime } from "./i18n";
import { refreshStudentSchedule, useStudentData } from "./studentData";


const days = [t("จันทร์"), t("อังคาร"), t("พุธ"), t("พฤหัสบดี"), t("ศุกร์"), t("เสาร์"), t("อาทิตย์")];
const timeSlots = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
];

const colorMap = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-50", border: "border-purple-400", text: "text-purple-700" },
  emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
  rose: { dot: "bg-rose-500", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-700" },
};

// build a lookup so we know which cells to render, skip, or leave empty
function buildGrid(classes) {
  const occupied = {}; // `${day}-${row}` -> true if part of a span (not the start)
  const startAt = {}; // `${day}-${row}` -> class object

  classes.forEach((c) => {
    startAt[`${c.day}-${c.startRow}`] = c;
    for (let r = c.startRow + 1; r < c.startRow + c.span; r++) {
      occupied[`${c.day}-${r}`] = true;
    }
  });

  return { occupied, startAt };
}

const timeOf = (c) => `${timeSlots[c.startRow].split(" - ")[0]} - ${timeSlots[c.startRow + c.span - 1].split(" - ")[1]}`;

export default function Schedule() {
  const { schedule, checkins } = useStudentData();
  const [view, setView] = useState("week");
  const terms = [...new Set(schedule.map((item) => item.term).filter(Boolean))];
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => { refreshStudentSchedule().catch(() => {}); }, []);
  const activeTerm = terms.includes(term) ? term : terms[0] || "";
  const classes = schedule.filter((item) => !activeTerm || item.term === activeTerm).map((item, index) => {
    const [startHour, startMinute] = (item.startTime || "").split(":").map(Number);
    const [endHour, endMinute] = (item.endTime || "").split(":").map(Number);
    const startRow = Math.max(0, Math.min(timeSlots.length - 1, Math.floor((startHour * 60 + startMinute - 8 * 60) / 60)));
    const endRow = Math.max(startRow + 1, Math.min(timeSlots.length, Math.ceil((endHour * 60 + endMinute - 8 * 60) / 60)));
    return { ...item, day: Number(item.day), startRow, span: endRow - startRow, color: ["blue", "purple", "emerald", "amber", "rose"][index % 5] };
  }).filter((item) => item.day >= 0 && item.day <= 6 && item.startTime && item.endTime);
  const courseCodes = new Set(classes.map((item) => item.code));
  const termCheckins = checkins.filter((item) => courseCodes.has(item.code));
  const presentCount = termCheckins.filter((item) => item.status === "ontime").length;
  const lateCount = termCheckins.filter((item) => item.status === "late").length;
  const absentCount = termCheckins.filter((item) => item.status === "absent").length;
  const stats = { rate: termCheckins.length ? (presentCount + lateCount) / termCheckins.length : 0, present: presentCount, late: lateCount, absent: absentCount };
  const { occupied, startAt } = buildGrid(classes);
  const selectedClass = classes.find((c) => `${c.code}-${c.day}` === selected);

  return (
    <StudentLayout>
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("ตารางเรียน")}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {t("ตารางเรียนของคุณ ประจำภาคเรียน {term}", { term })}
            </p>
          </div>
        </div>

        <select
          value={activeTerm}
          onChange={(e) => {
            setTerm(e.target.value);
            setSelected(null);
          }}
          aria-label={t("ภาคเรียน")}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white self-start lg:self-auto"
        >
          {terms.map((tm) => (
            <option key={tm} value={tm}>
              {t("ภาคเรียน {term}", { term: tm })}
            </option>
          ))}
        </select>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("week")}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
            view === "week"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          {t("ตารางสัปดาห์")}
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
            view === "list"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <List className="w-4 h-4" />
          {t("รายการวิชา")}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2.2fr_1fr] gap-5 items-start">
        {/* Timetable */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-x-auto">
          {!classes.length ? (
            <div className="py-12 text-center text-sm text-slate-400">{t("ยังไม่มีตารางเรียนในฐานข้อมูล")}</div>
          ) : view === "week" ? (
            <>
              <table className="w-full text-sm border-collapse min-w-[760px]">
                <thead>
                  <tr>
                    <th className="w-24 text-xs font-semibold text-slate-500 pb-3 text-left">
                      {t("เวลา")}
                    </th>
                    {days.map((d) => (
                      <th
                        key={d}
                        className="text-xs font-semibold text-slate-500 pb-3 px-1 text-center"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, row) => (
                    <tr key={slot} className="border-t border-slate-100">
                      <td className="py-2 pr-2 text-xs text-slate-400 align-top whitespace-nowrap">
                        {slot}
                      </td>
                      {days.map((_, day) => {
                        const key = `${day}-${row}`;
                        if (occupied[key]) return null; // covered by a rowSpan above
                        const cls = startAt[key];
                        if (cls) {
                          const cs = colorMap[cls.color];
                          return (
                            <td
                              key={key}
                              rowSpan={cls.span}
                              className="align-top p-1"
                            >
                              <button
                                type="button"
                                onClick={() => setSelected(`${cls.code}-${cls.day}`)}
                                className={`w-full h-full text-left rounded-xl border-l-4 ${cs.border} ${cs.bg} px-3 py-2 hover:brightness-95 transition ${
                                  selected === `${cls.code}-${cls.day}` ? "ring-2 ring-blue-300" : ""
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${cs.dot} shrink-0`} />
                                  <span className={`text-xs font-bold ${cs.text}`}>
                                    {cls.code}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 leading-snug mt-0.5">
                                  {cls.name}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {t("ห้อง {room}", { room: cls.room })}
                                </div>
                              </button>
                            </td>
                          );
                        }
                        return <td key={key} className="p-1 h-[52px]" />;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-slate-100">
                {classes
                  .filter((c, i, arr) => arr.findIndex((x) => x.code === c.code) === i)
                  .map((c) => (
                    <span key={c.code} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorMap[c.color].dot}`} />
                      {c.code}
                    </span>
                  ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {[...classes]
                .sort((a, b) => a.day - b.day || a.startRow - b.startRow)
                .map((c, i) => {
                  const cs = colorMap[c.color];
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setSelected(`${c.code}-${c.day}`)}
                      className={`w-full text-left flex items-center gap-4 rounded-xl border-l-4 ${cs.border} ${cs.bg} px-4 py-3 hover:brightness-95 transition ${
                        selected === `${c.code}-${c.day}` ? "ring-2 ring-blue-300" : ""
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-500 w-20 shrink-0">
                        {days[c.day]}
                      </div>
                      <div className="text-xs text-slate-500 w-28 shrink-0">{timeOf(c)}</div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-bold ${cs.text}`}>{c.code}</span>{" "}
                        <span className="text-sm text-slate-600">{c.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">{t("ห้อง {room}", { room: c.room })}</div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Selected class detail */}
          {selectedClass && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className={`text-sm font-bold ${colorMap[selectedClass.color].text}`}>{selectedClass.code}</div>
                  <div className="font-bold text-slate-900">{selectedClass.name}</div>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-slate-600">
                  {t("ปิด")}
                </button>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <div>
                  {t(days[selectedClass.day])} {fmtTime(timeOf(selectedClass))}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {t("ห้อง {room}", { room: selectedClass.room })}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Link
                  to={`/courses?open=${selectedClass.code}`}
                  className="flex-1 text-center text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50"
                >
                  {t("ดูรายวิชา")}
                </Link>
                <Link
                  to="/checkin"
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white bg-blue-600 rounded-lg py-2 hover:bg-blue-700"
                >
                  <ScanFace className="w-3.5 h-3.5" /> {t("เช็คชื่อ")}
                </Link>
              </div>
            </div>
          )}

          {/* Attendance stats */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900">{t("สถิติการเรียน")}</h3>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - stats.rate)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{Math.round(stats.rate * 100)}%</span>
                  <span className="text-[10px] text-slate-400">{t("อัตราเข้าเรียน")}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">{t("เข้าเรียน")}</span>
                  <span className="font-semibold text-slate-800 ml-auto">{t("{n} ครั้ง", { n: stats.present })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-600">{t("ขาดเรียน")}</span>
                  <span className="font-semibold text-slate-800 ml-auto">{t("{n} ครั้ง", { n: stats.absent })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-600">{t("สาย")}</span>
                  <span className="font-semibold text-slate-800 ml-auto">{t("{n} ครั้ง", { n: stats.late })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's schedule */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900">{t("ตารางเรียนวันนี้")}</h3>
            </div>
            <div className="space-y-3">
              {classes.filter((item) => item.day === ((new Date().getDay() + 6) % 7)).map((item) => {
                const cs = colorMap[item.color];
                return (
                  <Link to={`/courses?open=${item.code}`} key={`${item.code}-${item.day}`} className={`block rounded-xl ${cs.bg} px-4 py-3 hover:brightness-95 transition`}>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                      {timeOf(item)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${cs.text}`}>{item.code}</span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold bg-white text-slate-500 px-2 py-1 rounded-lg shrink-0">
                        <MapPin className="w-3 h-3" />
                        {t("ห้อง {room}", { room: item.room })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.name}</div>
                  </Link>
                );
              })}
              {!classes.some((item) => item.day === ((new Date().getDay() + 6) % 7)) && <p className="text-sm text-slate-400">{t("วันนี้ไม่มีคาบเรียนในตาราง")}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900">{t("หมายเหตุ / คำแนะนำ")}</h3>
            </div>
            <div className="space-y-2.5 mb-4">
              {[
                t("ตรวจสอบตารางเรียนเป็นประจำ"),
                t("เข้าห้องเรียนตามเวลา"),
                t("เตรียมอุปกรณ์การเรียนให้พร้อม"),
              ].map((tip) => (
                <div key={tip} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {t(tip)}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 bg-blue-50 text-blue-600 text-xs rounded-xl px-4 py-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              {t("หากพบว่าข้อมูลตารางเรียนไม่ถูกต้อง โปรดติดต่ออาจารย์ผู้สอน")}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
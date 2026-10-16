import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { t, LANG } from "./i18n";

// ปฏิทินเลือกวันที่ภาษาไทย (ปี พ.ศ.) ใช้แทน <input type="date"> ที่แสดงภาษาตามเบราว์เซอร์
// value / onChange ใช้รูปแบบ "YYYY-MM-DD" (ค.ศ.) เหมือน input type="date" จึงใช้กรองข้อมูลได้เหมือนเดิม

export const THAI_MONTHS = [
  t("มกราคม"), t("กุมภาพันธ์"), t("มีนาคม"), t("เมษายน"), t("พฤษภาคม"), t("มิถุนายน"),
  t("กรกฎาคม"), t("สิงหาคม"), t("กันยายน"), t("ตุลาคม"), t("พฤศจิกายน"), t("ธันวาคม"),
];
export const THAI_MONTHS_SHORT = [
  t("ม.ค."), t("ก.พ."), t("มี.ค."), t("เม.ย."), t("พ.ค."), t("มิ.ย."),
  t("ก.ค."), t("ส.ค."), t("ก.ย."), t("ต.ค."), t("พ.ย."), t("ธ.ค."),
];
// ปีไทยเป็น พ.ศ. (+543) ภาษาอังกฤษเป็น ค.ศ.
const YEAR_OFFSET = LANG === "en" ? 0 : 543;
const WEEKDAYS = [t("อา"), t("จ"), t("อ"), t("พ"), t("พฤ"), t("ศ"), t("ส")];

const pad = (n) => String(n).padStart(2, "0");
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const todayIso = () => {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
};

// "2024-05-15" -> "15 พ.ค. 2567"
export function formatThaiDate(iso) {
  if (!iso) return "";
  const { y, m, d } = parseIso(iso);
  return `${d} ${THAI_MONTHS_SHORT[m]} ${y + YEAR_OFFSET}`;
}

export default function ThaiDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = t("เลือกวันที่"),
  defaultMonth, // "YYYY-MM-DD" เดือนที่จะแสดงเมื่อยังไม่ได้เลือกวัน
  ariaLabel,
  align = "left",
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const start = parseIso(value || defaultMonth || todayIso());
  const [view, setView] = useState({ y: start.y, m: start.m });

  // ปิดเมื่อคลิกนอกปฏิทิน หรือกด Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const s = parseIso(value || defaultMonth || todayIso());
      setView({ y: s.y, m: s.m });
    }
    setOpen((v) => !v);
  };

  const shiftMonth = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const disabled = (iso) => (min && iso < min) || (max && iso > max);
  const pick = (iso) => {
    if (disabled(iso)) return;
    onChange(iso);
    setOpen(false);
  };

  // ช่องวันในเดือน (เริ่มวันอาทิตย์) รวมวันของเดือนก่อน/ถัดไปให้ครบ 6 แถว
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(view.y, view.m, i - firstWeekday + 1);
    return { iso: toIso(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === view.m };
  });
  const today = todayIso();
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 15 + i);
  if (!years.includes(view.y)) years.push(view.y);
  years.sort((a, b) => a - b);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`flex items-center gap-2 text-sm whitespace-nowrap focus:outline-none ${value ? "text-slate-700" : "text-slate-400"}`}
        >
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          {value ? formatThaiDate(value) : placeholder}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("ล้าง") + " " + (ariaLabel || t("วันที่"))}
            className="w-5 h-5 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel || t("เลือกวันที่")}
          className={`absolute top-full mt-3 z-40 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl p-4 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* เลือกเดือน/ปี */}
          <div className="flex items-center gap-1 mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t("เดือนก่อนหน้า")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={view.m}
              onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
              aria-label={t("เดือน")}
              className="flex-1 min-w-0 text-sm font-semibold text-slate-800 bg-transparent rounded-lg px-1 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {THAI_MONTHS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={view.y}
              onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
              aria-label={t("ปี พ.ศ.")}
              className="text-sm font-semibold text-slate-800 bg-transparent rounded-lg px-1 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y + YEAR_OFFSET}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t("เดือนถัดไป")}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* หัวตารางวัน */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : "text-slate-400"}`}>
                {w}
              </div>
            ))}
          </div>

          {/* วันที่ */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((c) => {
              const isSelected = c.iso === value;
              const isToday = c.iso === today;
              const off = disabled(c.iso);
              return (
                <button
                  type="button"
                  key={c.iso}
                  onClick={() => pick(c.iso)}
                  disabled={off}
                  aria-label={formatThaiDate(c.iso)}
                  aria-pressed={isSelected}
                  className={`h-9 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : off
                      ? "text-slate-200 cursor-not-allowed"
                      : c.inMonth
                      ? `text-slate-700 hover:bg-blue-50 ${isToday ? "ring-1 ring-blue-400 font-semibold text-blue-600" : ""}`
                      : "text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          {/* ปุ่มล่าง */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              {t("ล้าง")}
            </button>
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={disabled(today)}
              className="text-sm font-semibold text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              {t("วันนี้")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
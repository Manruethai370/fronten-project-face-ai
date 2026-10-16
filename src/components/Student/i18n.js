// ระบบแปลภาษาของหน้านักศึกษา (ไทย / English)
// ใช้: t("ข้อความภาษาไทย") -> คืนข้อความภาษาไทย หรือคำแปลภาษาอังกฤษจาก EN ตามภาษาที่เลือก
//      t("แสดง {from} - {to}", { from: 1, to: 8 }) -> แทนค่าใน {…}
// ภาษาเก็บใน localStorage และเมื่อเปลี่ยนภาษาจะโหลดหน้าใหม่ เพื่อให้ทุกข้อความเปลี่ยนพร้อมกัน
import { EN } from "./i18n-en";

const LANG_KEY = "faceattend_student_lang";

function readLang() {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

export const LANG = readLang();
export const LOCALE = LANG === "en" ? "en-GB" : "th-TH";

if (typeof document !== "undefined") document.documentElement.lang = LANG;

export function setLanguage(lang) {
  if (lang === LANG) return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  window.location.reload();
}

export function t(text, vars) {
  let out = LANG === "en" ? EN[text] ?? text : text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
}

/* ------------------------------------------------------------------ */
/* วันที่/เวลา ตามภาษา (ไทย = พ.ศ., English = ค.ศ.)                       */
/* ------------------------------------------------------------------ */
const toDate = (iso) => {
  if (iso instanceof Date) return iso;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "2024-05-15" -> "15 พ.ค. 2567" / "15 May 2024"
export const fmtDate = (iso, month = "short") =>
  toDate(iso).toLocaleDateString(LOCALE, { day: "numeric", month, year: "numeric" });

// "2024-05-15" -> "15 พฤษภาคม 2567" / "15 May 2024"
export const fmtDateLong = (iso) => fmtDate(iso, "long");

// "09:15" -> "09:15 น." / "09:15"
export const fmtTime = (hhmm) => (LANG === "en" ? hhmm : `${hhmm} น.`);

// "2024-06-12T14:30" -> "12 มิถุนายน 2567 เวลา 14:30 น." / "12 June 2024, 14:30"
export function fmtDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(value))) return value; // ข้อมูลเก่าที่เก็บเป็นข้อความ
  const [date, time] = String(value).split("T");
  if (!time) return fmtDateLong(date);
  return LANG === "en" ? `${fmtDateLong(date)}, ${time.slice(0, 5)}` : `${fmtDateLong(date)} เวลา ${time.slice(0, 5)} น.`;
}
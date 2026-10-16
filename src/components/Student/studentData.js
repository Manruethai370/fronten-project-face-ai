// ข้อมูลตัวอย่าง (mock) ที่ใช้ร่วมกันทุกหน้าของนักศึกษา + การตั้งค่าที่เก็บในเบราว์เซอร์
// เมื่อเชื่อม backend จริงแล้ว ให้เปลี่ยนข้อมูลในไฟล์นี้เป็นการเรียก API
import { useSyncExternalStore } from "react";
import { t } from "./i18n";

/* ------------------------------------------------------------------ */
/* store เล็กๆ ที่เก็บค่าใน localStorage และแจ้งทุกหน้าเมื่อค่าเปลี่ยน      */
/* ------------------------------------------------------------------ */
function createStore(key, initial) {
  let value = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = JSON.parse(raw);
  } catch {
    // localStorage ใช้ไม่ได้ — ใช้ค่าเริ่มต้นในหน่วยความจำ
  }
  const listeners = new Set();
  const store = {
    get: () => value,
    set(next) {
      value = typeof next === "function" ? next(value) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try {
        value = e.newValue ? JSON.parse(e.newValue) : initial;
      } catch {
        value = initial;
      }
      listeners.forEach((l) => l());
    });
  }
  return store;
}

const useStore = (store) => useSyncExternalStore(store.subscribe, store.get);

/* ------------------------------------------------------------------ */
/* โปรไฟล์นักศึกษา                                                       */
/* ------------------------------------------------------------------ */
export const DEFAULT_PROFILE = {
  fullName: t("นายกฤษฎา ใจดี"),
  nickname: t("กฤษฎา"),
  studentCode: "6601234567",
  email: "kritsada@example.com",
  phone: "081-234-5678",
  faculty: t("คณะวิทยาการคอมพิวเตอร์"),
  university: t("มหาวิทยาลัยเทคโนโลยี"),
  major: t("วิทยาการคอมพิวเตอร์"),
  year: t("ปีที่ 3"),
  group: "CS3/1",
  address: t("123 หมู่ 5 ต.สันทรายน้อย อ.สันทราย จ.เชียงใหม่ 50210"),
  joined: "2024-06-12",
  avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=faces",
};
// เก็บเฉพาะค่าที่ผู้ใช้แก้เอง (ข้อมูลตั้งต้นแปลตามภาษาที่เลือกได้)
export const profileStore = createStore("faceattend_student_profile_v2", {});
export const useProfile = () => ({ ...DEFAULT_PROFILE, ...useStore(profileStore) });
export const updateProfile = (patch) => profileStore.set((p) => ({ ...p, ...patch }));

/* ------------------------------------------------------------------ */
/* การตั้งค่า (ธีม ขนาดตัวอักษร การแจ้งเตือน)                              */
/* ------------------------------------------------------------------ */
export const DEFAULT_PREFS = {
  colorMode: "light", // light | dark | system
  fontSize: "normal", // small | normal | large
  notif: { checkin: true, schedule: true, announce: true, email: false, sound: true },
  twoFA: false,
};
export const prefsStore = createStore("faceattend_student_prefs", DEFAULT_PREFS);
export function usePrefs() {
  const p = useStore(prefsStore);
  return { ...DEFAULT_PREFS, ...p, notif: { ...DEFAULT_PREFS.notif, ...(p?.notif || {}) } };
}
export const updatePrefs = (patch) => prefsStore.set((p) => ({ ...DEFAULT_PREFS, ...p, ...patch }));
export const resetPrefs = () => prefsStore.set(DEFAULT_PREFS);

/* ------------------------------------------------------------------ */
/* สถานะการลงทะเบียนใบหน้า                                                */
/* ------------------------------------------------------------------ */
export const faceStore = createStore("faceattend_face_registration", {
  registered: true,
  at: "2024-06-12T14:30",
});
export const useFaceRegistration = () => useStore(faceStore);

/* ------------------------------------------------------------------ */
/* รายวิชา                                                               */
/* ------------------------------------------------------------------ */
export const COURSES = [
  { code: "CS-201", name: t("โครงสร้างข้อมูลและอัลกอริทึม"), nameEn: "(Data Structures)", teacher: t("รศ. ดร.สมชาย รุ่งเรือง"), schedule: t("จันทร์ 08:00 - 10:00"), room: t("ห้อง CS-201"), attended: 28, late: 1, absent: 1, total: 30, term: "1/2568", status: "studying", credit: 3 },
  { code: "CS-202", name: t("การเขียนโปรแกรมเชิงวัตถุ"), nameEn: "(Object Oriented Programming)", teacher: t("ผศ. ดร.นฤมล พิพัฒน์"), schedule: t("พุธ 13:00 - 15:00"), room: t("ห้อง CS-202"), attended: 25, late: 3, absent: 2, total: 30, term: "1/2568", status: "studying", credit: 3 },
  { code: "CS-203", name: t("ฐานข้อมูล"), nameEn: "(Database Systems)", teacher: t("อ. วิชาญ ศรีเกษม"), schedule: t("ศุกร์ 13:30 - 15:30"), room: t("ห้อง CS-203"), attended: 29, late: 1, absent: 0, total: 30, term: "1/2568", status: "studying", credit: 3 },
  { code: "CS-204", name: t("ระบบปฏิบัติการ"), nameEn: "(Operating Systems)", teacher: t("อ. กิตติพงษ์ อินทร์แก้ว"), schedule: t("อังคาร 09:00 - 11:00"), room: t("ห้อง CS-204"), attended: 23, late: 2, absent: 5, total: 30, term: "1/2568", status: "studying", credit: 3 },
  { code: "CS-205", name: t("ปัญญาประดิษฐ์เบื้องต้น"), nameEn: "(AI Introduction)", teacher: t("ผศ. ดร.จิราภา กุลจาติ"), schedule: t("พฤหัสบดี 15:30 - 17:30"), room: t("ห้อง CS-205"), attended: 28, late: 0, absent: 2, total: 30, term: "1/2568", status: "studying", credit: 3 },
  { code: "GE-101", name: t("ทักษะการเรียนรู้ในศตวรรษที่ 21"), nameEn: "(21st Century Learning Skills)", teacher: t("อ. อารีย์ วงศ์สวัสดิ์"), schedule: t("ศุกร์ 09:00 - 11:00"), room: t("ห้อง GE-101"), attended: 26, late: 2, absent: 2, total: 30, term: "1/2568", status: "studying", credit: 2 },
  { code: "CS-101", name: t("การเขียนโปรแกรมคอมพิวเตอร์"), nameEn: "(Computer Programming)", teacher: t("อ. วิชาญ ศรีเกษม"), schedule: t("จันทร์ 13:00 - 16:00"), room: t("ห้อง Lab 2"), attended: 30, late: 0, absent: 0, total: 30, term: "2/2567", status: "finished", credit: 3 },
  { code: "MA-102", name: t("แคลคูลัส 2"), nameEn: "(Calculus II)", teacher: t("ผศ. ดร.ปรีชา ทองดี"), schedule: t("อังคาร 13:00 - 15:00"), room: t("ห้อง SC-301"), attended: 27, late: 2, absent: 1, total: 30, term: "2/2567", status: "finished", credit: 3 },
];
export const courseName = (code) => COURSES.find((c) => c.code === code)?.name || "";

/* ------------------------------------------------------------------ */
/* ประกาศ                                                                */
/* ------------------------------------------------------------------ */
export const ANNOUNCEMENTS = [
  { id: 1, pinned: true, category: "exam", color: "rose", icon: "megaphone", title: t("สอบกลางภาควิชาโครงสร้างข้อมูลและอัลกอริทึม"), body: t("กำหนดสอบวันที่ 15 กันยายน 2568 เวลา 09:00 - 12:00 น.\nณ ห้องสอบ CS-101 โปรดเตรียมบัตรนักศึกษาและอุปกรณ์ให้พร้อม"), teacher: t("ผศ. ดร.สมชาย รุ่งเรือง"), course: "CS-201", date: "2025-09-12", time: "09:15" },
  { id: 2, pinned: true, category: "general", color: "rose", icon: "layers", title: t("ปิดระบบชั่วคราว"), body: t("วันที่ 20 ก.ย. 2568 เวลา 00:00 - 02:00 น. ปิดระบบเพื่อปรับปรุง\nระหว่างนี้จะไม่สามารถเช็คชื่อได้"), teacher: t("ฝ่ายดูแลระบบ"), course: null, date: "2025-09-11", time: "17:00" },
  { id: 3, category: "teaching", color: "blue", icon: "book", title: t("ส่งงาน Lab 3 ภายในวันที่ 25 กันยายน 2568"), body: t("นักศึกษาทุกคนต้องส่งงานผ่านระบบออนไลน์ ก่อนเวลา 23:59 น.\nหากไม่ส่งจะหักคะแนน 10 คะแนน"), teacher: t("ผศ. ดร.สมชาย รุ่งเรือง"), course: "CS-201", date: "2025-09-20", time: "10:30" },
  { id: 4, category: "teaching", color: "emerald", icon: "monitor", title: t("เปลี่ยนห้องเรียนจาก CS-202 เป็น CS-301"), body: t("ตั้งแต่สัปดาห์นี้เป็นต้นไป วิชาการเขียนโปรแกรมเชิงวัตถุ\nจะเรียนที่ห้อง CS-301 ทุกวันพุธ"), teacher: t("ผศ. ดร.นฤมล พิพัฒน์"), course: "CS-202", date: "2025-09-18", time: "13:45" },
  { id: 5, category: "activity", color: "amber", icon: "calendar", title: t("แจ้งกำหนดการนำเสนอ Project Final"), body: t("นักศึกษานำเสนอผลงานในวันที่ 5 ตุลาคม 2568\nเวลา 13:00 - 16:00 น. ห้อง CS-405"), teacher: t("ผศ. ดร.จิราภา กุลจาติ"), course: "CS-205", date: "2025-09-17", time: "09:00" },
  { id: 6, category: "exam", color: "purple", icon: "file", title: t("ประกาศคะแนนสอบปลายภาค"), body: t("สามารถตรวจสอบคะแนนสอบปลายภาคได้แล้ว\nผ่านระบบตั้งแต่วันนี้เป็นต้นไป"), teacher: t("อ. กิตติพงษ์ อินทร์แก้ว"), course: "CS-204", date: "2025-09-16", time: "16:20" },
  { id: 7, category: "teaching", color: "blue", icon: "book", title: t("งดการเรียนการสอนวันที่ 23 กันยายน"), body: t("เนื่องจากอาจารย์ติดภารกิจ จะมีการนัดชดเชยภายหลัง"), teacher: t("อ. วิชาญ ศรีเกษม"), course: "CS-203", date: "2025-09-15", time: "08:10" },
  { id: 8, category: "activity", color: "emerald", icon: "calendar", title: t("ขอเชิญร่วมกิจกรรม CS Open House"), body: t("วันที่ 30 กันยายน 2568 ณ อาคารวิทยาการคอมพิวเตอร์\nนักศึกษาที่เข้าร่วมจะได้รับชั่วโมงกิจกรรม"), teacher: t("ฝ่ายกิจการนักศึกษา"), course: null, date: "2025-09-14", time: "11:00" },
  { id: 9, category: "general", color: "purple", icon: "file", title: t("อัปเดตรูปใบหน้าเพื่อความแม่นยำในการเช็คชื่อ"), body: t("แนะนำให้อัปเดตรูปใบหน้าทุกภาคเรียน ได้ที่เมนู \"ลงทะเบียนใบหน้า\""), teacher: t("ฝ่ายดูแลระบบ"), course: null, date: "2025-09-10", time: "09:00" },
];
export const CATEGORY_LABEL = { teaching: t("การเรียนการสอน"), exam: t("การสอบ"), activity: t("กิจกรรม"), general: t("ทั่วไป") };

// ประกาศที่ "อ่านแล้ว" (เก็บไว้ในเบราว์เซอร์)
export const readStore = createStore("faceattend_read_announcements", [3, 4, 5, 6, 7, 8]);
export function useReadIds() {
  const list = useStore(readStore);
  return new Set(Array.isArray(list) ? list : []);
}
export function markRead(ids) {
  const add = Array.isArray(ids) ? ids : [ids];
  readStore.set((prev) => [...new Set([...(Array.isArray(prev) ? prev : []), ...add])]);
}

/* ------------------------------------------------------------------ */
/* คาบเรียนวันนี้ (ใช้ในแดชบอร์ด กระดิ่งแจ้งเตือน และหน้าเช็คชื่อ)            */
/* ------------------------------------------------------------------ */
export const TODAY_CLASSES = [
  { code: "CS-201", time: "08:00", endTime: "10:00", status: "checked", checkedAt: "08:05" },
  { code: "CS-202", time: "10:15", endTime: "12:15", status: "checked", checkedAt: "10:20" },
  { code: "CS-203", time: "13:00", endTime: "15:00", status: "pending" },
];

/* ------------------------------------------------------------------ */
/* ออกจากระบบ: ล้างข้อมูลการเข้าสู่ระบบที่อาจเก็บไว้                         */
/* ------------------------------------------------------------------ */
export function clearLoginSession() {
  try {
    for (const store of [localStorage, sessionStorage]) {
      Object.keys(store)
        .filter((k) => /token|user|session|auth/i.test(k))
        .forEach((k) => store.removeItem(k));
    }
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/* ดาวน์โหลดไฟล์ CSV (เปิดใน Excel ภาษาไทยได้)                              */
/* ------------------------------------------------------------------ */
export function downloadCsv(filename, headers, rows) {
  const cell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = "﻿" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
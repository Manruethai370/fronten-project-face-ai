// Shared Student data loaded from the API, with browser-local display preferences.
import { useEffect, useSyncExternalStore } from "react";
import { LANG, setLanguage, t } from "./i18n";
import {
  fetchStudentData,
  fetchStudentSchedule,
  getStudentToken,
  saveAnnouncementReads,
  saveStudentPreferences,
  updateStudentProfileFields,
} from "./studentApi";

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
  fullName: "",
  nickname: "",
  studentCode: "",
  email: "",
  phone: "",
  faculty: "",
  university: "มหาวิทยาลัยแม่โจ้",
  major: "",
  year: "",
  group: "",
  address: "",
  joined: "",
  avatar: "",
};
// เก็บเฉพาะค่าที่ผู้ใช้แก้เอง (ข้อมูลตั้งต้นแปลตามภาษาที่เลือกได้)
export const profileStore = createStore("faceattend_student_profile_v2", {});
export const useProfile = () => ({ ...DEFAULT_PROFILE, ...useStore(profileStore) });
export const updateProfile = async (patch) => {
  if (getStudentToken()) {
    await updateStudentProfileFields(patch);
  }
  profileStore.set((p) => ({ ...p, ...patch }));
};

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
export const updatePrefs = (patch) => {
  const previous = prefsStore.get();
  const next = { ...DEFAULT_PREFS, ...previous, ...patch, notif: { ...DEFAULT_PREFS.notif, ...(previous.notif || {}), ...(patch.notif || {}) } };
  prefsStore.set(next);
  if (getStudentToken()) {
    return saveStudentPreferences(next).catch((error) => {
      prefsStore.set(previous);
      window.dispatchEvent(new CustomEvent("student-save-error", { detail: error.message }));
      return null;
    });
  }
  return Promise.resolve(next);
};
export const resetPrefs = () => updatePrefs(DEFAULT_PREFS);

/* ------------------------------------------------------------------ */
/* สถานะการลงทะเบียนใบหน้า                                                */
/* ------------------------------------------------------------------ */
export const faceStore = createStore("faceattend_face_registration", {
  registered: false,
  at: null,
  approvalStatus: null,
});
export const useFaceRegistration = () => useStore(faceStore);

/* ------------------------------------------------------------------ */
/* รายวิชา                                                               */
/* ------------------------------------------------------------------ */
export const COURSES = [];
export const courseName = (code) => COURSES.find((c) => c.code === code)?.name || "";

/* ------------------------------------------------------------------ */
/* ประกาศ                                                                */
/* ------------------------------------------------------------------ */
export const ANNOUNCEMENTS = [];
export const CATEGORY_LABEL = { teaching: t("การเรียนการสอน"), exam: t("การสอบ"), activity: t("กิจกรรม"), general: t("ทั่วไป") };

let studentDataSnapshot = { status: "idle", error: "", checkins: [], todayClasses: [], schedule: [] };
const studentDataListeners = new Set();
let loadedToken = "";
let pendingToken = "";
const subscribeStudentData = (listener) => {
  studentDataListeners.add(listener);
  return () => studentDataListeners.delete(listener);
};
const notifyStudentData = (patch) => {
  studentDataSnapshot = { ...studentDataSnapshot, ...patch };
  studentDataListeners.forEach((listener) => listener());
};

function loadStudentData(token) {
    if (!token || token === pendingToken) return;
    pendingToken = token;
    profileStore.set({});
    COURSES.splice(0, COURSES.length);
    ANNOUNCEMENTS.splice(0, ANNOUNCEMENTS.length);
    TODAY_CLASSES.splice(0, TODAY_CLASSES.length);
    faceStore.set({ registered: false, at: null, approvalStatus: null });
    notifyStudentData({ status: "loading", error: "" });
    fetchStudentData()
      .then((data) => {
        if (getStudentToken() !== token) return;
        profileStore.set(data.profile);
        COURSES.splice(0, COURSES.length, ...data.courses);
        ANNOUNCEMENTS.splice(0, ANNOUNCEMENTS.length, ...data.announcements);
        TODAY_CLASSES.splice(0, TODAY_CLASSES.length, ...data.todayClasses);
        faceStore.set(data.face);
        if (data.preferences?.language && data.preferences.language !== LANG) {
          setLanguage(data.preferences.language);
          return;
        }
        prefsStore.set({ ...DEFAULT_PREFS, ...data.preferences, notif: { ...DEFAULT_PREFS.notif, ...(data.preferences?.notif || {}) } });
        readStore.set(data.readIds || []);
        SCHEDULE.splice(0, SCHEDULE.length, ...(data.schedule || []));
        loadedToken = token;
        notifyStudentData({ status: "ready", error: "", checkins: data.checkins, todayClasses: data.todayClasses, schedule: data.schedule || [] });
      })
      .catch((error) => {
        if (getStudentToken() !== token) return;
        notifyStudentData({ status: "error", error: error.message });
      })
      .finally(() => {
        if (pendingToken === token) pendingToken = "";
      });
}

export async function refreshStudentSchedule() {
  const schedule = await fetchStudentSchedule();
  SCHEDULE.splice(0, SCHEDULE.length, ...schedule);
  notifyStudentData({ schedule });
  return schedule;
}

export function useStudentData() {
  const state = useSyncExternalStore(subscribeStudentData, () => studentDataSnapshot);
  const token = getStudentToken();
  useEffect(() => {
    if (token && token !== loadedToken && studentDataSnapshot.status !== "loading") loadStudentData(token);
  }, [token]);
  return {
    ...state,
    checkins: studentDataSnapshot.checkins || [],
    todayClasses: studentDataSnapshot.todayClasses || [],
    schedule: studentDataSnapshot.schedule || [],
    refresh: () => loadStudentData(getStudentToken()),
    refreshSchedule: refreshStudentSchedule,
  };
}

export function resetStudentData() {
  loadedToken = "";
  pendingToken = "";
  notifyStudentData({ status: "idle", error: "", checkins: [], todayClasses: [], schedule: [] });
  profileStore.set({});
  COURSES.splice(0, COURSES.length);
  ANNOUNCEMENTS.splice(0, ANNOUNCEMENTS.length);
  TODAY_CLASSES.splice(0, TODAY_CLASSES.length);
  SCHEDULE.splice(0, SCHEDULE.length);
  prefsStore.set(DEFAULT_PREFS);
  readStore.set([]);
  faceStore.set({ registered: false, at: null, approvalStatus: null });
}

// ประกาศที่ "อ่านแล้ว" (เก็บไว้ในเบราว์เซอร์)
export const readStore = createStore("faceattend_read_announcements", []);
export function useReadIds() {
  const list = useStore(readStore);
  return new Set(Array.isArray(list) ? list : []);
}
export function markRead(ids) {
  const add = Array.isArray(ids) ? ids : [ids];
  const previous = Array.isArray(readStore.get()) ? readStore.get() : [];
  const next = [...new Set([...previous, ...add])];
  readStore.set(next);
  if (getStudentToken()) {
    saveAnnouncementReads(next).catch((error) => {
      readStore.set(previous);
      window.dispatchEvent(new CustomEvent("student-save-error", { detail: error.message }));
    });
  }
}

/* ------------------------------------------------------------------ */
/* คาบเรียนวันนี้ (ใช้ในแดชบอร์ด กระดิ่งแจ้งเตือน และหน้าเช็คชื่อ)            */
/* ------------------------------------------------------------------ */
export const TODAY_CLASSES = [];
export const SCHEDULE = [];

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
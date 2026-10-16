import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Camera, CheckCircle2, Clock, AlertTriangle, Info, MapPin, Users, ArrowRight, Code2 } from "lucide-react";
import StudentLayout from "./StudentLayout";
import { t } from "./i18n";


const historyItems = [
  {
    time: "08:05:32",
    date: t("20 พ.ค. 2567"),
    code: "CS-201",
    name: t("โครงสร้างข้อมูล"),
    status: "success",
    badge: t("เข้าเรียน"),
  },
  {
    time: "10:20:15",
    date: t("20 พ.ค. 2567"),
    code: "CS-202",
    name: t("การเขียนโปรแกรมเชิงวัตถุ"),
    status: "late",
    badge: t("รอเช็คชื่อ"),
  },
  {
    time: "13:30:00",
    date: t("20 พ.ค. 2567"),
    code: "CS-203",
    name: t("ฐานข้อมูล"),
    status: "absent",
    badge: t("ยังไม่ถึงเวลา"),
  },
];

export default function CheckIn() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [scanPhase, setScanPhase] = useState(0);
  const [cameraKey, setCameraKey] = useState(0); // เพิ่มค่าเพื่อเปิดกล้องใหม่

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // เปิดกล้องจริงของเครื่อง
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) setCameraError(err.message || t("ไม่สามารถเปิดกล้องได้"));
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [cameraKey]);

  // ยกเลิกการเช็คชื่อ: ปิดกล้องแล้วกลับหน้าหลัก
  const cancelCheckin = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    navigate("/dashboard");
  };

  // จำลองขั้นตอนการสแกน/ยืนยันตัวตน (จะแทนที่ด้วยผลจริงจากโมเดล face-recognition ภายหลัง)
  useEffect(() => {
    const phases = [
      { delay: 3000, phase: 1 },
      { delay: 5000, phase: 2 },
      { delay: 8000, phase: 0 },
    ];
    const timeouts = phases.map((p) => setTimeout(() => setScanPhase(p.phase), p.delay));
    const loop = setInterval(() => {
      setScanPhase(0);
      phases.forEach((p) => setTimeout(() => setScanPhase(p.phase), p.delay));
    }, 10000);
    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  const getRemainingMinutes = () => {
    const end = new Date(currentTime);
    end.setHours(9, 0, 0, 0);
    const diff = end - currentTime;
    if (diff <= 0) return "0:00";
    return `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(
      2,
      "0"
    )}`;
  };

  const getToastContent = () => {
    if (scanPhase === 1)
      return { icon: "✓", scanning: false, title: t("ตรวจจับใบหน้าแล้ว"), subtitle: t("กำลังยืนยันตัวตน...") };
    if (scanPhase === 2)
      return { icon: "✓", scanning: false, title: t("ยืนยันตัวตนสำเร็จ"), subtitle: t("บันทึกการเข้าเรียนแล้ว") };
    return { icon: "⟳", scanning: true, title: t("กำลังสแกนใบหน้า..."), subtitle: t("กรุณามองที่กล้อง") };
  };

  const toast = getToastContent();
  const borderColor = scanPhase >= 1 ? "#22c55e" : "#3b82f6";

  const statusIcon = (s) => {
    if (s === "success") return <CheckCircle2 className="w-4 h-4" />;
    if (s === "late") return <Clock className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };
  const statusBg = (s) => {
    if (s === "success") return "bg-emerald-50 text-emerald-600";
    if (s === "late") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-400";
  };
  const badgeBg = (s) => {
    if (s === "success") return "bg-emerald-50 text-emerald-600";
    if (s === "late") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-400";
  };

  return (
    <StudentLayout>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("เช็คชื่อเข้าเรียน")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("สแกนใบหน้าของคุณเพื่อเช็คชื่อเข้าเรียน")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.95fr_1fr]">
        {/* ===== LEFT COLUMN ===== */}
        <div className="space-y-5">
          {/* Combined status + camera card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {/* Status bar */}
            <div className="bg-gradient-to-r from-blue-50/80 to-white px-6 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-400 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="min-w-0 shrink-0">
                  <div className="text-base font-bold text-slate-900">{t("พร้อมเช็คชื่อ")}</div>
                  <div className="text-xs text-slate-500 leading-snug">
                    {t("กรุณาจัดตำแหน่งใบหน้าให้อยู่ในกรอบ")}
                  </div>
                </div>

                <div className="ml-auto shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] text-slate-500">{t("เวลาเปิดเช็คชื่อ")}</div>
                    <div className="text-xl font-bold text-slate-900">08:30</div>
                    <div className="text-sm text-slate-400">-</div>
                    <div className="text-xl font-bold text-slate-900">09:00</div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {t("เปิดเช็คชื่ออยู่")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-[10px] text-slate-500">{t("เหลือเวลา")}</div>
                    <div className="text-sm font-bold text-blue-600">
                      {t("{n} นาที", { n: getRemainingMinutes() })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera section — live feed */}
            <div
              className="relative flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, #0c1929, #162236)", minHeight: 420 }}
            >
              {/* Camera status indicator */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraError ? "bg-red-500" : "bg-emerald-500 animate-pulse"
                  }`}
                />
                <span className="text-sm text-slate-200 font-medium">
                  {cameraError ? t("กล้องไม่พร้อม") : t("กล้องกำลังทำงาน")}
                </span>
              </div>

              {cameraError ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-sm font-semibold text-white">{t("ไม่สามารถเปิดกล้องได้")}</div>
                  <div className="text-xs text-slate-400 max-w-xs">{cameraError}</div>
                  <div className="text-xs text-slate-500 max-w-xs">
                    {t("กรุณาอนุญาตให้เว็บไซต์เข้าถึงกล้อง แล้วลองใหม่อีกครั้ง")}
                  </div>
                  <button
                    onClick={() => {
                      setCameraError(null);
                      setCameraKey((k) => k + 1);
                    }}
                    className="mt-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t("ลองอีกครั้ง")}
                  </button>
                </div>
              ) : (
                <div
                  className="relative w-full h-full flex items-center justify-center"
                  style={{ minHeight: 420 }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover absolute inset-0"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {/* Detection frame overlay */}
                  <div
                    className="absolute rounded-2xl transition-all duration-500"
                    style={{
                      top: "10%",
                      left: "25%",
                      right: "25%",
                      bottom: "10%",
                      border: `2.5px solid ${borderColor}`,
                      boxShadow: `0 0 25px ${borderColor}33`,
                    }}
                  >
                    {[
                      "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                      "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                      "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                      "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                    ].map((pos, i) => (
                      <div key={i} className={`absolute w-6 h-6 ${pos}`} style={{ borderColor }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Status toast */}
              {!cameraError && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/65 backdrop-blur-xl px-5 py-3 rounded-full">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0 ${
                      toast.scanning ? "bg-blue-600 animate-spin" : "bg-emerald-600"
                    }`}
                    style={toast.scanning ? { animationDuration: "2s" } : undefined}
                  >
                    {toast.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white leading-snug">
                      {toast.title}
                    </div>
                    <div className="text-xs text-slate-400">{toast.subtitle}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tip */}
            <div className="flex items-center gap-3 px-5 py-3 bg-sky-50 border-t border-sky-100">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-sm text-sky-700">
                {t("คำแนะนำ: กรุณาอยู่นิ่งๆ อยู่ในที่แสงเพียงพอ และมองตรงไปที่กล้อง")}
              </span>
            </div>

            {/* Cancel */}
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelCheckin}
                className="w-full py-3 rounded-xl bg-white border border-blue-200 text-sm font-semibold text-blue-500 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                {t("ยกเลิกการเช็คชื่อ")}
              </button>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="space-y-5">
          {/* Subject info */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-slate-900">{t("ข้อมูลรายวิชา")}</div>
              <Link to="/courses?open=CS-201" className="text-xs text-blue-600 font-medium hover:underline">
                {t("ดูรายละเอียด")}
              </Link>
            </div>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">CS-201</div>
                <div className="text-xs text-slate-500">{t("โครงสร้างข้อมูล (Data Structures)")}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{t("อาจารย์ณัฐวุฒิ อาจารย์")}</div>
                  <div className="text-xs text-slate-500">{t("อาจารย์ผู้สอน")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">CS-201</div>
                  <div className="text-xs text-slate-500">{t("ห้องเรียน")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{t("จันทร์ 10:30 - 12:00")}</div>
                  <div className="text-xs text-slate-500">{t("เวลาเรียน")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold">{t("32 คน")}</div>
                  <div className="text-xs text-slate-500">{t("จำนวนนักศึกษา")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="text-sm font-semibold text-slate-900 mb-4">{t("ขั้นตอนการเช็คชื่อ")}</div>
            <ol className="space-y-4 text-sm text-slate-600">
              {[
                t("เปิดกล้องและจัดตำแหน่งใบหน้าให้อยู่ในกรอบ"),
                t("ระบบจะทำการตรวจจับและยืนยันตัวตน"),
                t("เช็คชื่อสำเร็จ ระบบจะแสดงสถานะให้ทราบ"),
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Today's history */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-slate-900">{t("ประวัติการเช็คชื่อวันนี้")}</div>
              <Link to="/history" className="text-xs text-blue-600 font-medium hover:underline">
                {t("ดูทั้งหมด")}
              </Link>
            </div>
            <div className="space-y-3">
              {historyItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusBg(
                        item.status
                      )}`}
                    >
                      {statusIcon(item.status)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{item.time}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {item.date} • {item.code} {item.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ml-2 ${badgeBg(
                      item.status
                    )}`}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/history"
              className="flex items-center justify-center gap-1 mt-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-blue-500 hover:bg-blue-50/50 transition-colors"
            >
              {t("ดูประวัติการเช็คชื่อทั้งหมด")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
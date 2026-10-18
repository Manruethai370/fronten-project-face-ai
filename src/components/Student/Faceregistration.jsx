import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ScanFace,
  Camera,
  Eye,
  Sun,
  Glasses,
  VenetianMask,
  MoveHorizontal,
  Info,
  Lock,
  Check,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { faceStore, useStudentData } from "./studentData";
import { uploadStudentFaceImages } from "./studentApi";
import { t } from "./i18n";

const steps = [
  { n: 1, title: t("เตรียมพร้อม"), sub: t("ตรวจสอบสภาพแวดล้อม") },
  { n: 2, title: t("บันทึกใบหน้า"), sub: t("เก็บข้อมูลใบหน้า") },
  { n: 3, title: t("ตรวจสอบข้อมูล"), sub: t("ตรวจสอบความถูกต้อง") },
  { n: 4, title: t("เสร็จสิ้น"), sub: t("ลงทะเบียนสำเร็จ") },
];

const guidelines = [
  { icon: Eye, label: t("มองตรงไปที่กล้อง") },
  { icon: ScanFace, label: t("ใบหน้าอยู่ในกรอบ") },
  { icon: Sun, label: t("แสงสว่างเพียงพอ") },
  { icon: Glasses, label: t("ไม่สวมแว่นตา") },
  { icon: VenetianMask, label: t("ไม่สวมหน้ากาก") },
  { icon: MoveHorizontal, label: t("ไม่หันหน้าไปด้านข้าง") },
];

// ท่าที่ต้องถ่าย ตามลำดับ
const POSES = [
  { label: t("มองตรง"), hint: t("มองตรงไปที่กล้อง") },
  { label: t("หันซ้าย 45°"), hint: t("หันหน้าไปทางซ้ายเล็กน้อย") },
  { label: t("หันขวา 45°"), hint: t("หันหน้าไปทางขวาเล็กน้อย") },
  { label: t("เงยหน้าเล็กน้อย"), hint: t("เงยหน้าขึ้นเล็กน้อย") },
];

const PLACEHOLDER = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=faces";

export default function FaceRegistration() {
  const navigate = useNavigate();
  const { refresh } = useStudentData();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [shots, setShots] = useState([]); // รูปที่ถ่ายแล้ว (data URL)
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cameraKey, setCameraKey] = useState(0); // เพิ่มค่าเพื่อเปิดกล้องใหม่
  const [submitError, setSubmitError] = useState("");

  const cameraOn = currentStep <= 2;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  // เปิดกล้องเฉพาะขั้นตอนที่ 1-2
  useEffect(() => {
    if (!cameraOn) return undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง"));
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 800 }, height: { ideal: 600 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch (err) {
        if (!cancelled) setCameraError(err.message || t("ไม่สามารถเปิดกล้องได้"));
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOn, cameraKey, stopCamera]);

  // ผูก stream เข้ากับ <video> ทุกครั้งที่ video ถูกสร้างใหม่ (เช่นหลังกด "ลองอีกครั้ง")
  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady, cameraError, currentStep]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    // กลับด้านให้ตรงกับภาพที่ผู้ใช้เห็น (กล้องหน้าแสดงแบบกระจก)
    ctx.translate(320, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, 320, 320);
    const next = [...shots, canvas.toDataURL("image/jpeg", 0.85)];
    setShots(next);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    if (next.length === POSES.length) setCurrentStep(3);
  };

  const retakeLast = () => setShots((s) => s.slice(0, -1));
  const restart = () => {
    setShots([]);
    setCurrentStep(2);
  };

  const cancel = () => {
    if (shots.length && !window.confirm(t("ยกเลิกการลงทะเบียนใบหน้า? รูปที่ถ่ายไว้จะหายไป"))) return;
    stopCamera();
    navigate("/profile");
  };

  const submit = async () => {
    setSaving(true);
    setSubmitError("");
    try {
      const result = await uploadStudentFaceImages(shots);
      faceStore.set({ registered: result.registered, approvalStatus: result.approvalStatus, at: new Date().toISOString() });
      await refresh();
      setCurrentStep(4);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const progress = currentStep === 4 ? 100 : currentStep === 3 ? 90 : Math.round((shots.length / POSES.length) * 80);
  const progressText =
    currentStep === 1
      ? [t("ยังไม่ได้เริ่มต้น"), t("กรุณาเริ่มบันทึกใบหน้า")]
      : currentStep === 2
      ? [t("ถ่ายแล้ว {n}/{total} ท่า", { n: shots.length, total: POSES.length }), t("ท่าถัดไป: {pose}", { pose: POSES[shots.length]?.label })]
      : currentStep === 3
      ? [t("ถ่ายครบแล้ว"), t("กรุณาตรวจสอบรูปก่อนยืนยัน")]
      : [t("ส่งข้อมูลแล้ว"), t("รอการตรวจสอบและอนุมัติ")];
  const circ = 2 * Math.PI * 52;

  return (
    <StudentLayout>
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ลงทะเบียนใบหน้า")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("ลงทะเบียนใบหน้าเพื่อใช้สำหรับการเช็คชื่อเข้าเรียน")}</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-6 overflow-x-auto">
        <div className="flex items-center min-w-[560px]">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    s.n === currentStep && currentStep !== 4
                      ? "bg-blue-600 text-white"
                      : s.n < currentStep || currentStep === 4
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s.n < currentStep || currentStep === 4 ? <Check className="w-4 h-4" /> : s.n}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-sm font-semibold ${s.n === currentStep ? "text-slate-900" : "text-slate-400"}`}>{s.title}</div>
                  <div className="text-xs text-slate-400">{s.sub}</div>
                </div>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-px mx-4 ${s.n < currentStep ? "bg-emerald-300" : "bg-slate-200"}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main content + side cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900">
            {t("ขั้นตอนที่ {n}: {title}", { n: currentStep, title: steps[currentStep - 1].title })}
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            {currentStep === 1 && t("กรุณาจัดตำแหน่งใบหน้าให้อยู่ในกรอบ และอยู่ในสภาพแวดล้อมที่เหมาะสม")}
            {currentStep === 2 && t("ท่าที่ {n}/{total}: {hint} แล้วกด \"ถ่ายภาพ\"", { n: shots.length + 1, total: POSES.length, hint: POSES[shots.length]?.hint })}
            {currentStep === 3 && t("ตรวจสอบว่ารูปทุกท่าเห็นใบหน้าชัดเจน แล้วกดยืนยัน")}
            {currentStep === 4 && t("ส่งรูปใบหน้าเรียบร้อยแล้ว ระบบจะเปิดใช้งานหลังได้รับการอนุมัติ")}
          </p>

          {cameraOn && (
            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">
              {/* Camera preview */}
              <div>
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900">
                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                      <Camera className="w-8 h-8 text-red-400" />
                      <div className="text-sm font-semibold text-white">{t("ไม่สามารถเปิดกล้องได้")}</div>
                      <div className="text-xs text-slate-400">{cameraError}</div>
                      <button
                        type="button"
                        onClick={() => { setCameraError(null); setCameraKey((k) => k + 1); }}
                        className="mt-1 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        {t("ลองอีกครั้ง")}
                      </button>
                    </div>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                  )}
                  {!cameraError && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                      <span className={`w-2 h-2 rounded-full ${cameraReady ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                      {cameraReady ? t("กล้องกำลังทำงาน") : t("กำลังเปิดกล้อง...")}
                    </div>
                  )}
                  {currentStep === 2 && !cameraError && (
                    <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      {POSES[shots.length]?.label}
                    </div>
                  )}
                  <div className="absolute inset-10 pointer-events-none">
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                  </div>
                  {flash && <div className="absolute inset-0 bg-white/70" />}
                </div>

                <div className="flex items-start gap-2 mt-3 bg-blue-50 text-blue-600 text-xs rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  {t("กรุณามองตรง ไม่สวมแว่นตา ไม่สวมหน้ากาก และอยู่ในที่แสงเพียงพอ")}
                </div>
              </div>

              {/* Guidelines */}
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-3">{t("คำแนะนำ")}</h4>
                <div className="space-y-3">
                  {guidelines.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {shots.map((src, i) => (
                <div key={i}>
                  <img src={src} alt={POSES[i].label} className="aspect-square w-full rounded-xl object-cover" />
                  <div className="text-xs text-center text-slate-500 mt-1.5">{POSES[i].label}</div>
                </div>
              ))}
            </div>
          )}

          {submitError && <p role="alert" className="mt-4 text-sm text-red-600">{submitError}</p>}

          {currentStep === 4 && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-slate-900">{t("ส่งข้อมูลใบหน้าแล้ว")}</div>
              <div className="text-sm text-slate-500 mt-1">{t("สถานะ: รอการตรวจสอบและอนุมัติ")}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {currentStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={cancel}
                  className="order-2 sm:order-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  {t("ยกเลิก")}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!cameraReady}
                  className="order-1 sm:order-2 sm:ml-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-semibold px-6 py-3 rounded-xl shadow-sm shadow-blue-200"
                >
                  <Camera className="w-4 h-4" />
                  {t("เริ่มบันทึกใบหน้า")}
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <button
                  type="button"
                  onClick={shots.length ? retakeLast : () => setCurrentStep(1)}
                  className="order-2 sm:order-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {shots.length ? t("ถ่ายท่าก่อนหน้าใหม่") : t("ย้อนกลับ")}
                </button>
                <button
                  type="button"
                  onClick={capture}
                  disabled={!cameraReady}
                  className="order-1 sm:order-2 sm:ml-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-semibold px-6 py-3 rounded-xl shadow-sm shadow-blue-200"
                >
                  <Camera className="w-4 h-4" />
                  {t("ถ่ายภาพ ({n}/{total})", { n: shots.length + 1, total: POSES.length })}
                </button>
              </>
            )}

            {currentStep === 3 && (
              <>
                <button
                  type="button"
                  onClick={restart}
                  disabled={saving}
                  className="order-2 sm:order-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("ถ่ายใหม่ทั้งหมด")}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="order-1 sm:order-2 sm:ml-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors text-white font-semibold px-6 py-3 rounded-xl shadow-sm shadow-blue-200"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? t("กำลังบันทึก...") : t("ยืนยันและบันทึก")}
                </button>
              </>
            )}

            {currentStep === 4 && (
              <>
                <Link
                  to="/profile"
                  className="order-2 sm:order-1 text-center px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  {t("กลับไปหน้าโปรไฟล์")}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-5">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">{t("ความคืบหน้า")}</h3>
            <div className="relative w-32 h-32 mx-auto">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={currentStep === 4 ? "#10b981" : "#2563eb"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - progress / 100)}
                  style={{ transition: "stroke-dashoffset 0.4s" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{progress}%</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <div className="text-sm font-semibold text-slate-700">{progressText[0]}</div>
              <div className="text-xs text-slate-400 mt-0.5">{progressText[1]}</div>
            </div>
          </div>

          {/* Pose examples / captured shots */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">{shots.length ? t("ท่าที่ถ่ายแล้ว") : t("ตัวอย่างท่าทางที่ถูกต้อง")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {POSES.map((p, i) => {
                const done = !!shots[i];
                const isNext = currentStep === 2 && i === shots.length;
                return (
                  <div key={p.label}>
                    <div
                      className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 ${isNext ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <img src={shots[i] || PLACEHOLDER} alt={p.label} className={`w-full h-full object-cover ${done ? "" : "opacity-60"}`} />
                      {done && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex items-center justify-center gap-1 mt-1.5 text-xs font-medium ${
                        done ? "text-emerald-600" : isNext ? "text-blue-600" : "text-slate-500"
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5" />}
                      {p.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {!shots.length && <p className="text-[11px] text-slate-400 mt-3 text-center">{t("* รูปตัวอย่าง จะแทนที่ด้วยรูปที่คุณถ่าย")}</p>}
          </div>

          {/* Data security */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2">
              <Lock className="w-4 h-4" />
              {t("ความปลอดภัยของข้อมูล")}
            </div>
            <p className="text-xs text-blue-600/80 leading-relaxed">
              {t("รูปใบหน้าจะถูกส่งไปจัดเก็บในระบบเพื่อรอการตรวจสอบและอนุมัติ")}
            </p>
            {cameraError && (
              <p className="flex items-start gap-1.5 text-xs text-amber-600 mt-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {t("ต้องอนุญาตให้เว็บไซต์ใช้กล้องก่อน จึงจะลงทะเบียนใบหน้าได้")}
              </p>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
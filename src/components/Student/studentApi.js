const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "faceattend_access_token";

export function getStudentToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

export function saveStudentToken(token, rememberMe) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearStudentToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStudentToken();
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearStudentToken();
      window.dispatchEvent(new Event("student-session-expired"));
    }
    throw new Error(body.detail || "ไม่สามารถเชื่อมต่อระบบได้");
  }
  return body;
}

export async function loginStudent(username, password, rememberMe) {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveStudentToken(result.access_token, rememberMe);
  return result.role;
}

export function fetchStudentData() {
  return request("/student/data");
}

export function fetchStudentSchedule() {
  return request("/student/schedule");
}

export function fetchStudentCheckinOptions() {
  return request("/student/checkin-options");
}

export function updateStudentProfile(profile) {
  return request("/student/profile", {
    method: "PATCH",
    body: JSON.stringify({ phone: profile.phone || null }),
  });
}

export function updateStudentProfileFields(profile) {
  return request("/student/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export function saveStudentPreferences(preferences) {
  return request("/student/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

export function saveAnnouncementReads(ids) {
  return request("/student/announcement-reads", {
    method: "POST",
    body: JSON.stringify(ids),
  });
}

export async function updateStudentPassword(currentPassword, newPassword) {
  return request("/student/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function uploadStudentFaceImages(images) {
  const formData = new FormData();
  images.forEach((image, index) => {
    const [metadata, encoded] = image.split(",");
    const mimeType = metadata.match(/^data:(image\/(?:jpeg|png|webp));base64$/)?.[1];
    if (!mimeType || !encoded) throw new Error("รูปใบหน้ามีรูปแบบไม่ถูกต้อง");
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    formData.append("files", new Blob([bytes], { type: mimeType }), `face-${index + 1}.${extension}`);
  });
  return request("/student/face-registration", { method: "POST", body: formData });
}

export function submitStudentCheckin(sessionId) {
  return request("/student/checkins", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, confirm_manual: true }),
  });
}

export function deleteStudentAccount() {
  return request("/student/account", { method: "DELETE" });
}
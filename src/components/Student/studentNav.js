import {
  Home,
  ScanFace,
  History,
  UserPlus,
  BookOpen,
  CalendarDays,
  Megaphone,
  User,
  Settings,
} from "lucide-react";
import { t } from "./i18n";

export const studentNavItems = [
  { icon: Home, label: t("หน้าหลัก"), to: "/dashboard", keywords: t("dashboard แดชบอร์ด สรุป หน้าแรก") },
  { icon: ScanFace, label: t("เช็คชื่อ"), to: "/checkin", keywords: t("checkin สแกน ใบหน้า กล้อง") },
  { icon: History, label: t("ประวัติการเช็คชื่อ"), to: "/history", keywords: t("history ย้อนหลัง สาย ขาด ส่งออก") },
  { icon: UserPlus, label: t("ลงทะเบียนใบหน้า"), to: "/face-registration", keywords: t("face register รูป ถ่ายรูป") },
  { icon: BookOpen, label: t("วิชาเรียนของฉัน"), to: "/courses", keywords: t("courses รายวิชา") },
  { icon: CalendarDays, label: t("ตารางเรียน"), to: "/schedule", keywords: t("schedule ตาราง คาบ สัปดาห์") },
  { icon: Megaphone, label: t("ประกาศ"), to: "/announcements", keywords: t("announcement ข่าว แจ้ง") },
  { icon: User, label: t("โปรไฟล์"), to: "/profile", keywords: t("profile ข้อมูลส่วนตัว เบอร์โทร") },
  { icon: Settings, label: t("ตั้งค่า"), to: "/settings", keywords: t("settings รหัสผ่าน password ธีม ตัวอักษร ภาษา") },
];
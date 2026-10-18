ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nickname varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_path varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS year_level varchar(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_name varchar(64) DEFAULT NULL;

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category enum('teaching','exam','activity','general') NOT NULL DEFAULT 'general';

CREATE TABLE IF NOT EXISTS student_preferences (
  student_id bigint(20) NOT NULL,
  preferences longtext NOT NULL,
  updated_at datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (student_id),
  CONSTRAINT fk_student_preferences_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_announcement_reads (
  student_id bigint(20) NOT NULL,
  announcement_id bigint(20) NOT NULL,
  read_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (student_id, announcement_id),
  CONSTRAINT fk_student_reads_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_reads_announcement FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_class_schedule (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  class_id bigint(20) NOT NULL,
  day_of_week tinyint(3) unsigned NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room varchar(100) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_student_schedule_class_day (class_id, day_of_week),
  CONSTRAINT fk_student_schedule_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT chk_student_schedule_day CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_face_images (
  id bigint(20) NOT NULL AUTO_INCREMENT,
  face_profile_id bigint(20) NOT NULL,
  pose_index tinyint(3) unsigned NOT NULL,
  image_path varchar(500) NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_face_pose (face_profile_id, pose_index),
  CONSTRAINT fk_student_face_images_profile FOREIGN KEY (face_profile_id) REFERENCES face_profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

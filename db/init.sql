-- MySQL init script — Salon Amira Beauty booking system
-- Runs on first container start

USE booking;

-- Ensure tables exist before seeding (first-run safety)
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL,
  price INT DEFAULT 0,
  color VARCHAR(7) DEFAULT '#b8860b',
  icon VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS availabilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  valid_from DATE,
  valid_until DATE,
  INDEX ix_availabilities_dow (day_of_week)
);

CREATE TABLE IF NOT EXISTS schedule_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  override_date DATE NOT NULL UNIQUE,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT TRUE,
  reason VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason VARCHAR(200),
  INDEX ix_blocked_slots_start (start_time)
);

-- Services beauté (avec icône et description)
INSERT IGNORE INTO services (name, duration_minutes, price, color, icon, description, is_active) VALUES
  ('Coiffure Femme', 45, 2500, '#c44569', '💇‍♀️', 'Coupe, brushing et coiffage sur mesure', 1),
  ('Brushing', 30, 1800, '#7c3aed', '✨', 'Brushing lissant ou bouclé professionnel', 1),
  ('Coloration', 90, 5000, '#5b21b6', '🎨', 'Coloration complète, mèches ou balayage', 1),
  ('Manucure', 30, 1500, '#be185d', '💅', 'Pose de vernis classique ou semi-permanent', 1),
  ('Soin Visage', 60, 3500, '#047857', '💆‍♀️', 'Nettoyage, hydratation et masque adapté', 1),
  ('Maquillage', 45, 3000, '#b45309', '💄', 'Maquillage jour, soirée ou mariage', 1),
  ('Épilation', 30, 2000, '#059669', '🌿', 'Épilation visage ou corps à la cire', 1);

-- Availabilities (Lun=0, Mar=1, Mer=2, Jeu=3, Ven=4, Sam=5)
INSERT IGNORE INTO availabilities (day_of_week, start_time, end_time) VALUES
  (0, '09:00', '12:00'),
  (0, '14:00', '18:00'),
  (1, '09:00', '12:00'),
  (1, '14:00', '18:00'),
  (2, '09:00', '12:00'),
  (2, '14:00', '18:00'),
  (3, '09:00', '12:00'),
  (3, '14:00', '18:00'),
  (4, '09:00', '12:00'),
  (4, '14:00', '18:00'),
  (5, '09:00', '14:00');

-- Schedule overrides (exceptions)
INSERT IGNORE INTO schedule_overrides (override_date, is_available, reason) VALUES
  ('2026-06-19', 0, 'Jour férié');

-- Blocked slots
INSERT IGNORE INTO blocked_slots (start_time, end_time, reason) VALUES
  ('2026-06-17 15:30:00', '2026-06-17 16:00:00', 'Rendez-vous personnel');

-- Settings (config salon — éditable depuis le panel admin)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (`key`, value) VALUES
  ('salon_name', 'Salon Amira'),
  ('salon_subtitle', 'Beauté & Bien-être — Alger Centre'),
  ('salon_address', '12 Rue Didouche, Alger Centre'),
  ('salon_phone', '0550 00 00 00'),
  ('salon_hours_weekday', 'Lun-Sam'),
  ('salon_hours_time', '9h00 – 18h00'),
  ('landing_hero_title', 'Salon Amira'),
  ('landing_hero_subtitle', 'Coiffure, soins visage, manucure, maquillage, épilation. Un salon où on prend le temps, au centre d''Alger.'),
  ('landing_hero_badge', '✨ Alger Centre · Beauté Féminine')
ON DUPLICATE KEY UPDATE value = VALUES(value);

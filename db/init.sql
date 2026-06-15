-- MySQL init script — Salon Amira Beauty booking system
-- Runs on first container start

USE booking;

-- Services beauté
INSERT INTO services (name, duration_minutes, price, color, is_active) VALUES
  ('Coiffure Femme', 45, 2500, '#c44569', 1),
  ('Brushing', 30, 1800, '#7c3aed', 1),
  ('Coloration', 90, 5000, '#5b21b6', 1),
  ('Manucure', 30, 1500, '#be185d', 1),
  ('Soin Visage', 60, 3500, '#047857', 1),
  ('Maquillage', 45, 3000, '#b45309', 1),
  ('Épilation', 30, 2000, '#059669', 1);

-- Availabilities (Lun=0, Mar=1, Mer=2, Jeu=3, Ven=4, Sam=5)
INSERT INTO availabilities (day_of_week, start_time, end_time) VALUES
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
INSERT INTO schedule_overrides (override_date, is_available, reason) VALUES
  ('2026-06-19', 0, 'Jour férié');

-- Blocked slots
INSERT INTO blocked_slots (start_time, end_time, reason) VALUES
  ('2026-06-17 15:30:00', '2026-06-17 16:00:00', 'Rendez-vous personnel');

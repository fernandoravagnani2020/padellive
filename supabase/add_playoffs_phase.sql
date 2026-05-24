-- Migración: agregar columna phase a rounds para soporte de playoffs
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'regular';

-- Asegurarse de que todos los rounds existentes queden como 'regular'
UPDATE rounds SET phase = 'regular' WHERE phase IS NULL OR phase = '';

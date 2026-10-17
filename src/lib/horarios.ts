// Grilla de turnos (90 min) según la fecha. Cada entrada rige desde `desde` (inclusive)
// hasta que empieza la siguiente. Mantener igual que en admin-reservas (api/exec.js).
// El backend ya manda la grilla de cada día en `week[i].timeSlots`; esto es el respaldo.
export const HORARIOS = [
  { desde: '0000-01-01', slots: ['09:30','11:00','12:30','14:30','16:00','17:30','19:00','20:30','22:00'] },
  { desde: '2026-11-01', slots: ['09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30','23:00'] },
]

const pad = (n: string) => n.padStart(2, '0')

export function slotsForDay(day: { year: string; month: string; date: string; timeSlots?: string[] }): string[] {
  if (day.timeSlots?.length) return day.timeSlots
  const fecha = `${day.year}-${pad(day.month)}-${pad(day.date)}`
  return HORARIOS.filter(h => h.desde <= fecha).pop()!.slots
}

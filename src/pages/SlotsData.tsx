/**
 * /slots — Página de datos de turnos para scraping externo.
 * No está linkeada desde la app. Expone todos los turnos de la semana
 * con su estado en una tabla HTML simple con data-attributes.
 *
 * Estados posibles: libre | reservado | en_curso | finalizado
 *
 * Ejemplo de uso con Python/BeautifulSoup:
 *   rows = soup.select('tr[data-estado="libre"]')
 *   for row in rows:
 *     print(row['data-dia'], row['data-hora'], row['data-precio'])
 */

import { useEffect, useRef, useState } from 'react'

interface DaySlots { [time: string]: string | null }
interface Day { day: string; date: string; month: string; year: string; slots: DaySlots }
interface Precios { semana: { [t: string]: number }; finDeSemana: { [t: string]: number } }
interface DescuentoConfig { activo: boolean | string | number; porcentaje: number; minutosAntes: number }
interface ScheduleData {
  week: Day[]; timeSlots: string[]; promociones: { [k: string]: string }
  precios: Precios | null; descuentoConfig: DescuentoConfig | null
}

const API_URL    = 'https://script.google.com/macros/s/AKfycbyd4O4dWAUnUgGeyok35PCeGSRAbxLu4uLfh6_WQQiOYSREVlkX6Dpru7sI3Fiuusn0/exec'
const TIME_SLOTS = ['09:30','11:00','12:30','14:30','16:00','17:30','19:00','20:30','22:00']
const DIAS_FDS   = ['SÁBADO','DOMINGO']

function pad(n: string) { return n.padStart(2, '0') }

function turnoFinalizado(fecha: string, hora: string) {
  const [y,m,d] = fecha.split('-').map(Number)
  const [h,min] = hora.split(':').map(Number)
  return new Date() > new Date(y, m-1, d, h, min+90)
}
function turnoEnCurso(fecha: string, hora: string) {
  const [y,m,d] = fecha.split('-').map(Number)
  const [h,min] = hora.split(':').map(Number)
  const ini = new Date(y,m-1,d,h,min), fin = new Date(y,m-1,d,h,min+90), now = new Date()
  return now >= ini && now <= fin
}
function getPrice(data: ScheduleData, dia: string, hora: string) {
  if (!data.precios) return 20000
  return (DIAS_FDS.includes(dia) ? data.precios.finDeSemana?.[hora] : data.precios.semana?.[hora]) || 20000
}
function hasDiscount(data: ScheduleData, fecha: string, hora: string) {
  const dc = data.descuentoConfig; if (!dc) return false
  const activo = dc.activo === true || dc.activo === 'true' || dc.activo === 1; if (!activo) return false
  const [y,m,d] = fecha.split('-').map(Number); const [h,min] = hora.split(':').map(Number)
  const mins = (new Date(y,m-1,d,h,min).getTime() - Date.now()) / 60000
  return mins > 0 && mins <= dc.minutosAntes
}

type Estado = 'libre' | 'reservado' | 'en_curso' | 'finalizado'

export default function SlotsData() {
  const [data, setData] = useState<ScheduleData>({
    week: [], timeSlots: TIME_SLOTS, promociones: {}, precios: null, descuentoConfig: null,
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [updated, setUpdated] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadData() {
    try {
      const res    = await fetch(`${API_URL}?action=getTodo`)
      const result = await res.json()
      if (result.success) {
        setData(prev => ({
          ...prev,
          week: result.data.week,
          precios: result.data.precios,
          descuentoConfig: result.data.descuento,
          promociones: result.data.promociones || {},
        }))
        setError('')
        setUpdated(new Date().toISOString())
      } else throw new Error(result.error)
    } catch { setError('Error al cargar datos') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Construir filas de datos
  const rows: {
    dia: string; fecha: string; hora: string
    estado: Estado; precio: number; precioOriginal: number
    descuento: boolean; porcentajeDescuento: number; promo: string
  }[] = []

  for (const day of data.week) {
    const fecha = `${day.year}-${pad(day.month)}-${pad(day.date)}`
    for (const time of (data.timeSlots.length ? data.timeSlots : TIME_SLOTS)) {
      const enCurso  = turnoEnCurso(fecha, time)
      const fin      = !enCurso && turnoFinalizado(fecha, time)
      const ocupado  = !!day.slots[time]
      const pBase    = getPrice(data, day.day, time)
      const desc     = !ocupado && !enCurso && !fin && hasDiscount(data, fecha, time)
      const pct      = data.descuentoConfig?.porcentaje || 0
      const precio   = desc ? Math.round(pBase * (1-pct/100)) : pBase
      const promo    = data.promociones[`${day.day}-${time}`] || ''
      const estado: Estado = enCurso ? 'en_curso' : fin ? 'finalizado' : ocupado ? 'reservado' : 'libre'

      rows.push({ dia: day.day, fecha, hora: time, estado, precio, precioOriginal: pBase, descuento: desc, porcentajeDescuento: pct, promo })
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, padding: 16, background: '#fff' }}>
      {/* Meta-información para el scraper */}
      <div id="slots-meta"
        data-generado={updated}
        data-total={rows.length}
        data-libres={rows.filter(r => r.estado === 'libre').length}
        data-error={error}
        style={{ marginBottom: 12, color: '#555' }}
      >
        {loading && <span id="slots-loading">Cargando...</span>}
        {!loading && !error && (
          <span>
            Actualizado: <span id="slots-updated">{updated}</span> —{' '}
            <span id="slots-count-libres">{rows.filter(r => r.estado === 'libre').length}</span> turnos libres
          </span>
        )}
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      {/* Tabla principal — fácil de scrapear */}
      <table id="slots-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>dia</th>
            <th>fecha</th>
            <th>hora</th>
            <th>estado</th>
            <th>precio</th>
            <th>precio_original</th>
            <th>descuento_pct</th>
            <th>promo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`slot slot-${r.estado}`}
              data-dia={r.dia}
              data-fecha={r.fecha}
              data-hora={r.hora}
              data-estado={r.estado}
              data-precio={r.precio}
              data-precio-original={r.precioOriginal}
              data-descuento={r.descuento ? r.porcentajeDescuento : 0}
              data-promo={r.promo}
            >
              <td className="col-dia">{r.dia}</td>
              <td className="col-fecha">{r.fecha}</td>
              <td className="col-hora">{r.hora}</td>
              <td className="col-estado">{r.estado}</td>
              <td className="col-precio">{r.precio}</td>
              <td className="col-precio-original">{r.precioOriginal}</td>
              <td className="col-descuento">{r.descuento ? r.porcentajeDescuento : 0}</td>
              <td className="col-promo">{r.promo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

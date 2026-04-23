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
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_FDS   = ['SÁBADO','DOMINGO']

function formatPrice(n: number) { return '$' + n.toLocaleString('es-AR') }

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
function reserveSlot(dia: string, fecha: string, mes: string, hora: string, precio: number) {
  const msg = `Hola! Quiero reservar un turno para el *${dia} ${fecha} de ${mes}* a las *${hora}*. Precio: *${formatPrice(precio)}*. ¿Está disponible?`
  window.open(`https://wa.me/5493584294011?text=${encodeURIComponent(msg)}`, '_blank')
}

type SlotType = 'free' | 'taken' | 'live' | 'done'

function SlotBadge({ type, light = false }: { type: SlotType; light?: boolean }) {
  type Cfg = { label: string; bg: string; color: string; border: string }
  const cfg: Record<SlotType, Cfg> = {
    free:  { label: 'Disponible', bg: 'rgba(22,163,74,0.1)',    color: '#15803d', border: 'rgba(22,163,74,0.25)' },
    taken: light
      ? { label: 'Reservado',  bg: 'rgba(0,0,0,0.06)',         color: '#555',    border: 'rgba(0,0,0,0.14)' }
      : { label: 'Reservado',  bg: 'rgba(255,255,255,0.08)',   color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.1)' },
    live:  { label: 'En curso',   bg: 'rgba(234,88,12,0.12)',  color: '#c2410c', border: 'rgba(234,88,12,0.28)' },
    done:  { label: 'Finalizado', bg: 'rgba(0,0,0,0.05)',      color: '#bbb',    border: 'rgba(0,0,0,0.08)' },
  }
  const c = cfg[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {type === 'live' && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c', display: 'inline-block', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
      )}
      {c.label}
    </span>
  )
}

function SlotCard({ day, time, data, compact = false }: { day: Day; time: string; data: ScheduleData; compact?: boolean }) {
  const fecha   = `${day.year}-${day.month.padStart(2,'0')}-${day.date.padStart(2,'0')}`
  const mes     = MONTH_NAMES[parseInt(day.month)-1]
  const enCurso = turnoEnCurso(fecha, time)
  const fin     = !enCurso && turnoFinalizado(fecha, time)
  const ocupado = !!day.slots[time]
  const pBase   = getPrice(data, day.day, time)
  const desc    = !ocupado && !enCurso && !fin && hasDiscount(data, fecha, time)
  const pct     = data.descuentoConfig?.porcentaje || 10
  const precio  = desc ? Math.round(pBase * (1-pct/100)) : pBase
  const promo   = data.promociones[`${day.day}-${time}`]

  const type: SlotType = enCurso ? 'live' : fin ? 'done' : ocupado ? 'taken' : 'free'
  const isFree = type === 'free'

  const cardStyle: React.CSSProperties = {
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s',
    cursor: isFree ? 'pointer' : 'default',
    ...(type === 'free'  ? { background: '#fff',    border: '1px solid rgba(22,163,74,0.35)',     boxShadow: '0 1px 4px rgba(0,0,0,0.04)' } : {}),
    ...(type === 'taken' ? { background: '#141414', border: '1px solid rgba(255,255,255,0.04)',   opacity: 0.9 } : {}),
    ...(type === 'live'  ? { background: 'rgba(234,88,12,0.04)', border: '1px solid rgba(234,88,12,0.28)' } : {}),
    ...(type === 'done'  ? { background: '#f5f5f5', border: '1px solid rgba(0,0,0,0.06)',        opacity: 0.5 } : {}),
  }

  const timeColor: Record<SlotType, string> = { free: '#111', taken: '#fff', live: '#111', done: '#999' }

  return (
    <div style={cardStyle} onClick={isFree ? () => reserveSlot(day.day, day.date, mes, time, precio) : undefined}>
      {(type === 'free' || type === 'live') && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: type === 'free' ? '#16a34a' : '#ea580c' }} />
      )}

      {compact ? (
        // Desktop: hora + precio en fila 1, badge en fila 2
        <div style={{ padding: '8px 10px 8px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: '0.02em', color: timeColor[type], lineHeight: 1 }}>
              {time}
            </div>
            {isFree && (
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: '0.02em', color: '#111', lineHeight: 1 }}>
                {desc && <span style={{ fontSize: 10, textDecoration: 'line-through', color: '#ccc', marginRight: 4 }}>{formatPrice(pBase)}</span>}
                {formatPrice(precio)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <SlotBadge type={type} />
            {desc && isFree && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.1)', padding: '1px 4px', borderRadius: 3 }}>{pct}% OFF</span>
            )}
          </div>
        </div>
      ) : (
        // Mobile: hora arriba, badge+precio en fila 2
        <div style={{ padding: '12px 14px 12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.02em', color: timeColor[type], lineHeight: 1, marginBottom: 4 }}>
              {time}
            </div>
            <SlotBadge type={type} />
            {promo && isFree && (
              <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1d4ed8', background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.2)', padding: '1px 6px', borderRadius: 99, display: 'inline-block' }}>
                {promo}
              </div>
            )}
          </div>
          {isFree && (
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
              {desc && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.1)', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginBottom: 1 }}>{pct}% OFF</div>
                  <div style={{ fontSize: 10, textDecoration: 'line-through', color: '#ccc', display: 'block' }}>{formatPrice(pBase)}</div>
                </>
              )}
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '0.02em', color: '#111' }}>
                {formatPrice(precio)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Reservas() {
  const [data, setData] = useState<ScheduleData>({
    week: [], timeSlots: TIME_SLOTS, promociones: {}, precios: null, descuentoConfig: null,
  })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [dayIndex, setDayIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function loadData() {
    try {
      const res = await fetch(`${API_URL}?action=getTodo`)
      const result = await res.json()
      if (result.success) {
        setData(prev => ({ ...prev, week: result.data.week, precios: result.data.precios, descuentoConfig: result.data.descuento, promociones: result.data.promociones || {} }))
        setError('')
      } else throw new Error(result.error)
    } catch { setError('Error al cargar turnos. Tocá para reintentar.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const legend = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 18, paddingBottom: 4 }}>
      {(['free', 'taken', 'live', 'done'] as SlotType[]).map(type => (
        <SlotBadge key={type} type={type} light />
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ padding: 20 }}>
      {Array(6).fill(0).map((_,i) => (
        <div key={i} style={{ height: 68, borderRadius: 8, marginBottom: 8, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
      <p style={{ fontSize: 14, marginBottom: 16 }}>{error}</p>
      <button onClick={loadData} style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>
        Reintentar
      </button>
    </div>
  )

  // ── DESKTOP: grilla 7 columnas ────────────────────────────
  if (!isMobile) return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        {data.week.map((day) => {
          const mon = MONTH_NAMES[parseInt(day.month)-1]
          return (
            <div key={day.date} style={{ background: '#f5f5f5', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ background: '#0a0a0a', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>
                  {day.day}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: 2 }}>
                  {day.date} {mon}
                </div>
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {TIME_SLOTS.map(time => <SlotCard key={time} day={day} time={time} data={data} compact />)}
              </div>
            </div>
          )
        })}
      </div>
      {legend}
    </div>
  )

  // ── MOBILE: tabs por día ──────────────────────────────────
  const activeDay = data.week[dayIndex]
  return (
    <div style={{ padding: '16px 16px 20px' }}>
      {/* Selector de día */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 16,
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        {data.week.map((day, i) => {
          const mon = MONTH_NAMES[parseInt(day.month)-1]
          const active = i === dayIndex
          return (
            <button key={i} onClick={() => setDayIndex(i)} style={{
              minWidth: 68, padding: '9px 10px', borderRadius: 8, textAlign: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
              background: active ? '#0a0a0a' : '#f5f5f5',
              border: active ? '1px solid transparent' : '1px solid rgba(0,0,0,0.08)',
              fontFamily: 'inherit', outline: 'none',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', color: active ? '#fff' : '#111', textTransform: 'uppercase' }}>
                {day.day.slice(0, 3)}
              </div>
              <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.55)' : '#666', marginTop: 2 }}>
                {day.date} {mon}
              </div>
            </button>
          )
        })}
      </div>

      {/* Slots del día activo */}
      {activeDay && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TIME_SLOTS.map(time => <SlotCard key={time} day={activeDay} time={time} data={data} />)}
        </div>
      )}
      {legend}
    </div>
  )
}

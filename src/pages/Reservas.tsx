import { useEffect, useRef, useState } from 'react'

// ── Tipos ─────────────────────────────────────────────────

interface DaySlots { [time: string]: string | null }
interface Day {
  day: string; date: string; month: string; year: string; slots: DaySlots
}
interface Precios {
  semana: { [time: string]: number }
  finDeSemana: { [time: string]: number }
}
interface DescuentoConfig {
  activo: boolean | string | number
  porcentaje: number
  minutosAntes: number
}
interface ScheduleData {
  week: Day[]
  timeSlots: string[]
  promociones: { [key: string]: string }
  precios: Precios | null
  descuentoConfig: DescuentoConfig | null
}

// ── Constantes ────────────────────────────────────────────

const API_URL = 'https://script.google.com/macros/s/AKfycbyd4O4dWAUnUgGeyok35PCeGSRAbxLu4uLfh6_WQQiOYSREVlkX6Dpru7sI3Fiuusn0/exec'
const TIME_SLOTS = ['09:00','10:30','12:00','14:00','15:30','17:00','18:30','20:00','21:30','23:00']
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_FDS = ['SÁBADO','DOMINGO']

// ── Helpers ───────────────────────────────────────────────

function formatPrice(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function turnoFinalizado(fecha: string, hora: string) {
  const [y,m,d] = fecha.split('-').map(Number)
  const [h,min] = hora.split(':').map(Number)
  const fin = new Date(y, m-1, d, h, min+90)
  return new Date() > fin
}

function turnoEnCurso(fecha: string, hora: string) {
  const [y,m,d] = fecha.split('-').map(Number)
  const [h,min] = hora.split(':').map(Number)
  const inicio = new Date(y, m-1, d, h, min)
  const fin    = new Date(y, m-1, d, h, min+90)
  const now    = new Date()
  return now >= inicio && now <= fin
}

function getPrice(data: ScheduleData, dia: string, hora: string) {
  if (!data.precios) return 20000
  const esFds = DIAS_FDS.includes(dia)
  return (esFds ? data.precios.finDeSemana?.[hora] : data.precios.semana?.[hora]) || 20000
}

function hasDiscount(data: ScheduleData, fecha: string, hora: string) {
  const dc = data.descuentoConfig
  if (!dc) return false
  const activo = dc.activo === true || dc.activo === 'true' || dc.activo === 1
  if (!activo) return false
  const [y,m,d] = fecha.split('-').map(Number)
  const [h,min] = hora.split(':').map(Number)
  const turno   = new Date(y, m-1, d, h, min)
  const mins    = (turno.getTime() - Date.now()) / 60000
  return mins > 0 && mins <= dc.minutosAntes
}

function reserveSlot(dia: string, fecha: string, mes: string, hora: string, precio: number) {
  const msg = `Hola! Quiero reservar un turno para el *${dia} ${fecha} de ${mes}* a las *${hora}*. Precio: *${formatPrice(precio)}*. ¿Está disponible?`
  window.open(`https://wa.me/5493584294011?text=${encodeURIComponent(msg)}`, '_blank')
}

// ── Slot card ─────────────────────────────────────────────

function SlotCard({ day, time }: { day: Day; time: string }) {
  const fecha = `${day.year}-${day.month.padStart(2,'0')}-${day.date.padStart(2,'0')}`
  const mes   = MONTH_NAMES[parseInt(day.month)-1]

  // Estado no disponible porque no hay scheduleData aquí — se pasa como prop
  return null // placeholder — ver componente padre
}

// ── Main component ────────────────────────────────────────

export default function Reservas() {
  const [data,        setData]        = useState<ScheduleData>({
    week: [], timeSlots: TIME_SLOTS, promociones: {}, precios: null, descuentoConfig: null,
  })
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [dayIndex,    setDayIndex]    = useState(0)
  const isMobile     = window.innerWidth < 1024
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadData() {
    try {
      const res    = await fetch(`${API_URL}?action=getTodo`)
      const result = await res.json()
      if (result.success) {
        setData(prev => ({
          ...prev,
          week:           result.data.week,
          precios:        result.data.precios,
          descuentoConfig:result.data.descuento,
          promociones:    result.data.promociones || {},
        }))
        setError('')
      } else throw new Error(result.error)
    } catch (e) {
      setError('Error al cargar turnos. Tocá para reintentar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // ── Render slot ──────────────────────────────────────────
  function renderSlot(day: Day, time: string) {
    const fecha      = `${day.year}-${day.month.padStart(2,'0')}-${day.date.padStart(2,'0')}`
    const mes        = MONTH_NAMES[parseInt(day.month)-1]
    const enCurso    = turnoEnCurso(fecha, time)
    const finalizado = !enCurso && turnoFinalizado(fecha, time)
    const ocupado    = !!day.slots[time]
    const promoKey   = `${day.day}-${time}`
    const promo      = data.promociones[promoKey]
    const precioBase = getPrice(data, day.day, time)
    const descuento  = !ocupado && hasDiscount(data, fecha, time)
    const pct        = data.descuentoConfig?.porcentaje || 10
    const precio     = descuento ? Math.round(precioBase * (1 - pct/100)) : precioBase

    // En curso
    if (enCurso) return (
      <div key={time} style={slotStyle('in-progress')}>
        <div style={slotContent}>
          <div><div style={slotTime}>{time}</div><div style={slotStatus}>🏃 EN CURSO</div></div>
        </div>
      </div>
    )

    // Finalizado
    if (finalizado) return (
      <div key={time} style={slotStyle('finished')}>
        <div style={slotContent}>
          <div><div style={slotTime}>{time}</div><div style={slotStatus}>⏱️ FINALIZADO</div></div>
        </div>
      </div>
    )

    // Ocupado
    if (ocupado) return (
      <div key={time} style={slotStyle('occupied')}>
        <div style={slotContent}>
          <div style={{ flex:1 }}>
            <div style={slotTime}>{time}</div>
            <div style={slotStatus}>✕ RESERVADO</div>
          </div>
          <div style={{ textAlign:'right', color:'rgba(255,255,255,0.5)', fontSize:'1.2em', fontWeight:'bold', textTransform:'uppercase' }}>
            {typeof day.slots[time] === 'string' ? day.slots[time] : ''}
          </div>
        </div>
      </div>
    )

    // Disponible
    return (
      <div key={time} style={slotStyle('available')} onClick={() => reserveSlot(day.day, day.date, mes, time, precio)}>
        <div style={slotContent}>
          <div style={{ flex:1 }}>
            <div style={{ ...slotTime, color:'#000' }}>{time}</div>
            <div style={{ ...slotStatus, color:'#2e7d32' }}>✓ DISPONIBLE</div>
            {promo && <div style={promoStyle}>🎁 {promo}</div>}
          </div>
          <div style={{ textAlign:'right' }}>
            {descuento && <>
              <div style={discountBadge}>🔥 {pct}% OFF</div>
              <div style={originalPrice}>{formatPrice(precioBase)}</div>
            </>}
            <div style={{ fontSize:'1.4em', fontWeight:'bold', color:'#000' }}>{formatPrice(precio)}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Skeleton ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding:15 }}>
      {Array(6).fill(0).map((_,i) => (
        <div key={i} style={{ height:80, borderRadius:10, marginBottom:10, background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.2s infinite' }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign:'center', padding:40, color:'#dc3545' }}>
      <p>{error}</p>
      <button onClick={loadData} style={{ marginTop:16, padding:'10px 24px', background:'#000', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
        Reintentar
      </button>
    </div>
  )

  // ── Vista mobile ──────────────────────────────────────────
  const activeDay = data.week[dayIndex]

  return (
    <div style={{ padding:15 }}>
      {/* Selector de días */}
      <div style={{ display:'flex', overflowX:'auto', gap:8, paddingBottom:10, marginBottom:15, WebkitOverflowScrolling:'touch' }}>
        {data.week.map((day, i) => {
          const mon = MONTH_NAMES[parseInt(day.month)-1]
          const active = i === dayIndex
          return (
            <div key={i} onClick={() => setDayIndex(i)} style={{
              minWidth:100, padding:'12px 16px', borderRadius:8, textAlign:'center', cursor:'pointer',
              flexShrink:0, transition:'all 0.2s',
              background:  active ? '#000' : '#fff',
              border:      active ? '2px solid #000' : '2px solid #e0e0e0',
              color:       active ? '#fff' : '#000',
              fontWeight:  active ? 'bold' : 'normal',
            }}>
              <div style={{ fontSize:'0.85em', fontWeight:600, marginBottom:3 }}>{day.day}</div>
              <div style={{ fontSize:'0.75em', opacity:0.8 }}>{day.date} {mon}</div>
            </div>
          )
        })}
      </div>

      {/* Slots del día activo */}
      {activeDay && (
        <div style={{ display:'grid', gap:10 }}>
          {TIME_SLOTS.map(time => renderSlot(activeDay, time))}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:15, padding:15, background:'#f8f9fa', marginTop:15, borderRadius:10, fontSize:'0.85em' }}>
        {[
          { color: 'linear-gradient(135deg,#fff 0%,#f5f5f5 100%)', border:'2px solid #00c853', label:'Disponible' },
          { color: 'linear-gradient(135deg,#1a1a1a 0%,#000 100%)', border:'2px solid #d32f2f', label:'Ocupado' },
          { color: 'linear-gradient(135deg,#ff6f00 0%,#ff8f00 100%)', border:'none', label:'En Curso' },
          { color: 'linear-gradient(135deg,#424242 0%,#303030 100%)', border:'none', label:'Finalizado' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:25, height:25, borderRadius:5, background:item.color, border:item.border, flexShrink:0 }} />
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Estilos inline ────────────────────────────────────────

type SlotType = 'available' | 'occupied' | 'finished' | 'in-progress'

function slotStyle(type: SlotType): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius:10, overflow:'hidden', transition:'all 0.3s ease',
    boxShadow:'0 2px 8px rgba(0,0,0,0.1)', marginBottom:0,
  }
  switch(type) {
    case 'available':   return { ...base, background:'linear-gradient(135deg,#fff 0%,#f5f5f5 100%)', cursor:'pointer', border:'2px solid #00c853', color:'#000' }
    case 'occupied':    return { ...base, background:'linear-gradient(135deg,#1a1a1a 0%,#000 100%)', cursor:'not-allowed', opacity:0.85, border:'2px solid #d32f2f' }
    case 'finished':    return { ...base, background:'linear-gradient(135deg,#424242 0%,#303030 100%)', cursor:'not-allowed', opacity:0.5, border:'2px solid #616161' }
    case 'in-progress': return { ...base, background:'linear-gradient(135deg,#ff6f00 0%,#ff8f00 100%)', cursor:'default', border:'2px solid #ff6f00', color:'white' }
  }
}

const slotContent: React.CSSProperties = { padding:15, display:'flex', justifyContent:'space-between', alignItems:'center' }
const slotTime:    React.CSSProperties = { fontWeight:'bold', fontSize:'1.3em', marginBottom:4 }
const slotStatus:  React.CSSProperties = { fontSize:'0.75em', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }
const promoStyle:  React.CSSProperties = { background:'#1976d2', color:'#fff', padding:'3px 8px', borderRadius:5, fontSize:'0.7em', fontWeight:'bold', display:'inline-block', marginTop:3 }
const discountBadge: React.CSSProperties = { background:'#00c853', color:'#fff', padding:'3px 8px', borderRadius:5, fontSize:'0.7em', fontWeight:'bold', display:'inline-block', animation:'pulse 2s infinite' }
const originalPrice: React.CSSProperties = { fontSize:'0.8em', textDecoration:'line-through', opacity:0.8 }

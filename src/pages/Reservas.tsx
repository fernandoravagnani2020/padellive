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
const TIME_SLOTS = ['09:00','10:30','12:00','14:00','15:30','17:00','18:30','20:00','21:30','23:00']
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

  function renderSlot(day: Day, time: string) {
    const fecha    = `${day.year}-${day.month.padStart(2,'0')}-${day.date.padStart(2,'0')}`
    const mes      = MONTH_NAMES[parseInt(day.month)-1]
    const enCurso  = turnoEnCurso(fecha, time)
    const fin      = !enCurso && turnoFinalizado(fecha, time)
    const ocupado  = !!day.slots[time]
    const pBase    = getPrice(data, day.day, time)
    const desc     = !ocupado && hasDiscount(data, fecha, time)
    const pct      = data.descuentoConfig?.porcentaje || 10
    const precio   = desc ? Math.round(pBase * (1-pct/100)) : pBase
    const promo    = data.promociones[`${day.day}-${time}`]

    if (enCurso) return (
      <div key={time} style={SS('in-progress')}>
        <div style={SC}>
          <div>
            <div style={{ ...ST, color:'#fff' }}>{time}</div>
            <div style={{ ...SSt, color:'rgba(255,255,255,0.9)' }}>🏃 EN CURSO</div>
          </div>
        </div>
      </div>
    )
    if (fin) return (
      <div key={time} style={SS('finished')}>
        <div style={SC}>
          <div>
            <div style={{ ...ST, color:'rgba(255,255,255,0.7)' }}>{time}</div>
            <div style={{ ...SSt, color:'rgba(255,255,255,0.5)' }}>⏱️ FINALIZADO</div>
          </div>
        </div>
      </div>
    )
    if (ocupado) return (
      <div key={time} style={SS('occupied')}>
        <div style={SC}>
          <div style={{ flex:1 }}>
            <div style={{ ...ST, color:'#fff' }}>{time}</div>
            <div style={{ ...SSt, color:'rgba(255,255,255,0.8)' }}>✕ RESERVADO</div>
          </div>
          {/* No mostramos el nombre — solo el estado */}
        </div>
      </div>
    )
    return (
      <div key={time} style={SS('available')} onClick={() => reserveSlot(day.day, day.date, mes, time, precio)}>
        <div style={SC}>
          <div style={{ flex:1 }}>
            <div style={{ ...ST, color:'#000' }}>{time}</div>
            <div style={{ ...SSt, color:'#2e7d32' }}>✓ DISPONIBLE</div>
            {promo && <div style={PS}>🎁 {promo}</div>}
          </div>
          <div style={{ textAlign:'right' }}>
            {desc && <><div style={DB}>🔥 {pct}% OFF</div><div style={OP}>{formatPrice(pBase)}</div></>}
            <div style={{ fontSize:'1.4em', fontWeight:'bold', color:'#000' }}>{formatPrice(precio)}</div>
          </div>
        </div>
      </div>
    )
  }

  const legend = (
    <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:15, padding:15, background:'#f8f9fa', marginTop:15, borderRadius:10, fontSize:'0.85em' }}>
      {[
        { bg:'linear-gradient(135deg,#fff 0%,#f5f5f5 100%)', border:'2px solid #00c853', label:'Disponible' },
        { bg:'linear-gradient(135deg,#1a1a1a 0%,#000 100%)', border:'2px solid #d32f2f', label:'Ocupado' },
        { bg:'linear-gradient(135deg,#ff6f00 0%,#ff8f00 100%)', border:'none',           label:'En Curso' },
        { bg:'linear-gradient(135deg,#424242 0%,#303030 100%)', border:'none',           label:'Finalizado' },
      ].map(item => (
        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:25, height:25, borderRadius:5, background:item.bg, border:item.border, flexShrink:0 }} />
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ padding:15 }}>
      {Array(6).fill(0).map((_,i) => <div key={i} style={{ height:80, borderRadius:10, marginBottom:10, background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.2s infinite' }} />)}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ textAlign:'center', padding:40, color:'#dc3545' }}>
      <p>{error}</p>
      <button onClick={loadData} style={{ marginTop:16, padding:'10px 24px', background:'#000', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>Reintentar</button>
    </div>
  )

  // ── DESKTOP: grilla 7 columnas ────────────────────────────
  if (!isMobile) return (
    <div style={{ padding:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:10 }}>
        {data.week.map((day) => {
          const mon = MONTH_NAMES[parseInt(day.month)-1]
          return (
            <div key={day.date} style={{ background:'#f8f9fa', borderRadius:10, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
              {/* Header del día */}
              <div style={{ background:'linear-gradient(135deg,#000 0%,#1a1a1a 100%)', color:'white', padding:10, textAlign:'center', fontWeight:'bold' }}>
                <div style={{ fontSize:'0.9em', marginBottom:3 }}>{day.day}</div>
                <div style={{ fontSize:'0.75em', opacity:0.9 }}>{day.date} {mon}</div>
              </div>
              {/* Slots */}
              <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8 }}>
                {TIME_SLOTS.map(time => {
                  const fecha   = `${day.year}-${day.month.padStart(2,'0')}-${day.date.padStart(2,'0')}`
                  const mes2    = mon
                  const enCurso = turnoEnCurso(fecha, time)
                  const fin     = !enCurso && turnoFinalizado(fecha, time)
                  const ocupado = !!day.slots[time]
                  const pBase   = getPrice(data, day.day, time)
                  const desc    = !ocupado && hasDiscount(data, fecha, time)
                  const pct     = data.descuentoConfig?.porcentaje || 10
                  const precio  = desc ? Math.round(pBase*(1-pct/100)) : pBase
                  const promo   = data.promociones[`${day.day}-${time}`]

                  const base: React.CSSProperties = { borderRadius:8, padding:10, fontSize:'0.85em', transition:'all 0.3s', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }

                  if (enCurso) return (
                    <div key={time} style={{ ...base, background:'linear-gradient(135deg,#ff6f00,#ff8f00)', border:'2px solid #ff6f00', color:'white' }}>
                      <div style={{ fontWeight:'bold', fontSize:'1em' }}>{time}</div>
                      <div style={{ fontSize:'0.7em', fontWeight:600, textTransform:'uppercase' }}>🏃 EN CURSO</div>
                    </div>
                  )
                  if (fin) return (
                    <div key={time} style={{ ...base, background:'linear-gradient(135deg,#424242,#303030)', border:'2px solid #616161', opacity:0.5, color:'white' }}>
                      <div style={{ fontWeight:'bold' }}>{time}</div>
                      <div style={{ fontSize:'0.7em', fontWeight:600, textTransform:'uppercase' }}>⏱️ FINALIZADO</div>
                    </div>
                  )
                  if (ocupado) return (
                    <div key={time} style={{ ...base, background:'linear-gradient(135deg,#1a1a1a,#000)', border:'2px solid #d32f2f', opacity:0.85, color:'white' }}>
                      <div style={{ fontWeight:'bold' }}>{time}</div>
                      <div style={{ fontSize:'0.7em', fontWeight:600, textTransform:'uppercase' }}>✕ RESERVADO</div>
                      {typeof day.slots[time]==='string' && <div style={{ fontSize:'0.8em', opacity:0.7, textTransform:'uppercase' }}>{day.slots[time]}</div>}
                    </div>
                  )
                  return (
                    <div key={time} onClick={() => reserveSlot(day.day, day.date, mes2, time, precio)}
                      style={{ ...base, background:'linear-gradient(135deg,#fff,#f5f5f5)', border:'2px solid #00c853', cursor:'pointer', color:'#000' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='scale(0.98)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='scale(1)' }}
                    >
                      <div style={{ fontWeight:'bold', fontSize:'1em' }}>{time}</div>
                      <div style={{ fontSize:'0.7em', fontWeight:600, color:'#2e7d32', textTransform:'uppercase' }}>✓ DISPONIBLE</div>
                      {promo && <div style={{ background:'#1976d2', color:'#fff', padding:'2px 6px', borderRadius:4, fontSize:'0.65em', fontWeight:'bold', display:'inline-block', marginTop:2 }}>🎁 {promo}</div>}
                      {desc && <div style={{ background:'#00c853', color:'#fff', padding:'2px 6px', borderRadius:4, fontSize:'0.65em', fontWeight:'bold', display:'inline-block' }}>🔥 {pct}% OFF</div>}
                      {desc && <div style={{ fontSize:'0.7em', textDecoration:'line-through', opacity:0.6 }}>{formatPrice(pBase)}</div>}
                      <div style={{ fontWeight:'bold', fontSize:'1.1em' }}>{formatPrice(precio)}</div>
                    </div>
                  )
                })}
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
    <div style={{ padding:15 }}>
      <div style={{ display:'flex', overflowX:'auto', gap:8, paddingBottom:10, marginBottom:15, WebkitOverflowScrolling:'touch' }}>
        {data.week.map((day, i) => {
          const mon = MONTH_NAMES[parseInt(day.month)-1]
          const active = i === dayIndex
          return (
            <div key={i} onClick={() => setDayIndex(i)} style={{
              minWidth:100, padding:'12px 16px', borderRadius:8, textAlign:'center', cursor:'pointer', flexShrink:0, transition:'all 0.2s',
              background: active?'#000':'#fff', border: active?'2px solid #000':'2px solid #e0e0e0',
              color: active?'#fff':'#000', fontWeight: active?'bold':'normal',
            }}>
              <div style={{ fontSize:'0.85em', fontWeight:600, marginBottom:3 }}>{day.day}</div>
              <div style={{ fontSize:'0.75em', opacity:0.8 }}>{day.date} {mon}</div>
            </div>
          )
        })}
      </div>
      {activeDay && <div style={{ display:'grid', gap:10 }}>{TIME_SLOTS.map(time => renderSlot(activeDay, time))}</div>}
      {legend}
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────
type SlotType = 'available'|'occupied'|'finished'|'in-progress'
function SS(t: SlotType): React.CSSProperties {
  const base: React.CSSProperties = { borderRadius:10, overflow:'hidden', transition:'all 0.3s ease', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }
  if (t==='available')   return { ...base, background:'linear-gradient(135deg,#fff 0%,#f5f5f5 100%)', cursor:'pointer', border:'2px solid #00c853', color:'#000' }
  if (t==='occupied')    return { ...base, background:'linear-gradient(135deg,#1a1a1a 0%,#000 100%)', cursor:'not-allowed', opacity:0.85, border:'2px solid #d32f2f' }
  if (t==='finished')    return { ...base, background:'linear-gradient(135deg,#424242 0%,#303030 100%)', cursor:'not-allowed', opacity:0.5, border:'2px solid #616161' }
  return { ...base, background:'linear-gradient(135deg,#ff6f00 0%,#ff8f00 100%)', cursor:'default', border:'2px solid #ff6f00', color:'white' }
}
const SC: React.CSSProperties = { padding:15, display:'flex', justifyContent:'space-between', alignItems:'center', minHeight:70 }
const ST: React.CSSProperties = { fontWeight:'bold', fontSize:'1.3em', marginBottom:4 }
const SSt: React.CSSProperties = { fontSize:'0.75em', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }
const PS: React.CSSProperties = { background:'#1976d2', color:'#fff', padding:'3px 8px', borderRadius:5, fontSize:'0.7em', fontWeight:'bold', display:'inline-block', marginTop:3 }
const DB: React.CSSProperties = { background:'#00c853', color:'#fff', padding:'3px 8px', borderRadius:5, fontSize:'0.7em', fontWeight:'bold', display:'inline-block' }
const OP: React.CSSProperties = { fontSize:'0.8em', textDecoration:'line-through', opacity:0.8 }

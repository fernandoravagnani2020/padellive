import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tournament } from '../store/tournament'

function PulseDot() {
  return <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#16a34a', animation:'pulse-dot 1.5s ease-in-out infinite', flexShrink:0 }} />
}

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const base: React.CSSProperties = { display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, letterSpacing:'0.08em', padding:'3px 9px', borderRadius:99, textTransform:'uppercase' }
  if (status === 'live')     return <span style={{ ...base, background:'rgba(22,163,74,0.1)', color:'#15803d', border:'1px solid rgba(22,163,74,0.25)' }}><PulseDot /> En vivo</span>
  if (status === 'upcoming') return <span style={{ ...base, background:'rgba(0,0,0,0.05)', color:'#888', border:'1px solid rgba(0,0,0,0.1)' }}>Próximo</span>
  return                            <span style={{ ...base, background:'rgba(0,0,0,0.03)', color:'#bbb', border:'1px solid rgba(0,0,0,0.07)' }}>Finalizado</span>
}

function TournamentCard({ t }: { t: Tournament }) {
  const navigate = useNavigate()
  const isLive = t.status === 'live'
  const isDone = t.status === 'finished'

  return (
    <div
      onClick={() => navigate(`/torneo/${t.id}`)}
      style={{
        background: '#fff',
        border: isLive ? '1.5px solid rgba(22,163,74,0.4)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        boxShadow: isLive ? '0 2px 16px rgba(22,163,74,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: isDone ? 0.7 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isLive ? 'rgba(22,163,74,0.6)' : 'rgba(0,0,0,0.18)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isLive ? 'rgba(22,163,74,0.4)' : 'rgba(0,0,0,0.08)'; e.currentTarget.style.boxShadow = isLive ? '0 2px 16px rgba(22,163,74,0.08)' : '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {isLive && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#16a34a' }} />}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <StatusBadge status={t.status} />
        <span style={{ fontSize:11, color:'#aaa', fontWeight:500 }}>
          {t.gender === 'male' ? 'Caballeros' : t.gender === 'female' ? 'Damas' : 'Mixto'}
        </span>
      </div>

      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, letterSpacing:'0.02em', lineHeight:1, color:'#111', marginBottom:4 }}>
        {t.name}
      </div>
      <div style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>
        {t.start_date ? new Date(t.start_date + 'T00:00:00').toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' }) : ''}
      </div>

      <div style={{ display:'flex', gap:20, marginBottom:18 }}>
        {[
          { label:'Parejas',   value: t.pairs_count },
          { label:'Canchas',   value: t.courts_count },
          { label:'Categoría', value: t.category },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        display:'inline-flex', alignItems:'center', gap:6,
        background: isLive ? '#16a34a' : 'rgba(0,0,0,0.05)',
        color: isLive ? '#fff' : '#555',
        fontFamily:"'Bebas Neue', sans-serif", fontSize:15, letterSpacing:'0.05em',
        padding:'8px 16px', borderRadius:8,
        border: isLive ? 'none' : '1px solid rgba(0,0,0,0.1)',
      }}>
        {isLive ? 'Ver en vivo →' : isDone ? 'Ver resultados →' : 'Ver torneo →'}
      </div>
    </div>
  )
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      if (data) setTournaments(data)
      setLoading(false)
    }
    load()
    const ch = supabase.channel('home-t')
      .on('postgres_changes', { event:'*', schema:'public', table:'tournaments' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const live     = tournaments.filter(t => t.status === 'live')
  const upcoming = tournaments.filter(t => t.status === 'upcoming')
  const finished = tournaments.filter(t => t.status === 'finished')

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:200 }}>
      <div style={{ width:22, height:22, border:'2px solid #16a34a', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  function Section({ label, items }: { label: string; items: Tournament[] }) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom:36 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#bbb', textTransform:'uppercase', marginBottom:12 }}>{label}</div>
        <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
          {items.map(t => <TournamentCard key={t.id} t={t} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop:28 }}>
      {/* Hero */}
      <div className="animate-fade-in" style={{ marginBottom:36 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:56, height:56, borderRadius:10, objectFit:'cover', border:'1px solid rgba(0,0,0,0.08)', flexShrink:0 }} />
          <div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(28px, 6vw, 44px)', letterSpacing:'0.03em', lineHeight:1, color:'#111' }}>
              Negro Padel <span style={{ color:'#ccc' }}>&amp;</span> Encuentro
            </div>
            <div style={{ fontSize:10, letterSpacing:'0.16em', color:'#bbb', textTransform:'uppercase', fontWeight:600, marginTop:2 }}>
              Torneos
            </div>
          </div>
        </div>
        {live.length > 0 && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10, fontWeight:700, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:99, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', color:'#15803d', textTransform:'uppercase' }}>
            <PulseDot />{live.length} torneo{live.length > 1 ? 's' : ''} en curso
          </span>
        )}
      </div>

      <Section label="🟢 En vivo ahora" items={live} />
      <Section label="Próximos" items={upcoming} />
      <Section label="Historial" items={finished} />

      {tournaments.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎾</div>
          <p style={{ fontSize:14, color:'#aaa' }}>Sin torneos cargados.</p>
          <p style={{ fontSize:12, color:'#bbb', marginTop:4 }}>Creá el primero desde el panel Admin.</p>
        </div>
      )}
    </div>
  )
}

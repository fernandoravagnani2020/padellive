import { useParams, useNavigate } from 'react-router-dom'
import { useTournamentStore } from '../store/tournament'
import { useTournament } from '../hooks/useTournament'
import ZonesTab from '../components/ZonesTab'
import { ScheduleTab, ResultsTab, BracketTab, InfoTab } from '../components/Tabs'

const TABS = [
  { id: 'zonas',      label: 'Zonas'      },
  { id: 'bracket',    label: 'Cuadro'     },
  { id: 'info',       label: 'Info'       },
]

export default function Tournament() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTournament, activeTab, setActiveTab } = useTournamentStore()
  useTournament(id!)

  const isLive = currentTournament?.status === 'live'

  function shareWA() {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent('🎾 Seguí el torneo en vivo → ')
    window.open(`https://wa.me/?text=${text}${url}`, '_blank')
  }

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in" style={{ padding:'24px 0 20px', borderBottom:'1px solid rgba(0,0,0,0.07)', marginBottom:20 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background:'none', border:'none', color:'#aaa', fontSize:13, cursor:'pointer', marginBottom:14, padding:0, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}
        >
          ← Volver
        </button>

        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div>
            <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(30px, 6vw, 50px)', letterSpacing:'0.03em', lineHeight:1, color:'#111', marginBottom:5 }}>
              {currentTournament?.name ?? '...'}
            </h2>
            <p style={{ fontSize:12, color:'#bbb' }}>Negro Padel &amp; Encuentro · Torneos</p>
            {isLive && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:10, background:'rgba(22,163,74,0.07)', border:'1px solid rgba(22,163,74,0.2)', color:'#15803d', fontSize:10, fontWeight:700, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:99, textTransform:'uppercase' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', animation:'pulse-dot 1.5s infinite', display:'inline-block' }} />
                En vivo · Actualización automática
              </div>
            )}
          </div>
          <button
            onClick={shareWA}
            style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', color:'#15803d', padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
          >
            📲 Compartir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#f5f5f5', border:'1px solid rgba(0,0,0,0.07)', borderRadius:10, padding:4, marginBottom:20, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              whiteSpace:'nowrap', fontFamily:"'Bebas Neue', sans-serif",
              fontSize:15, letterSpacing:'0.05em', padding:'7px 16px', borderRadius:7,
              border:'none', cursor:'pointer',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#111' : '#999',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content con fade al cambiar tab */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === 'zonas'      && <ZonesTab />}
        {activeTab === 'bracket'    && <BracketTab />}
        {activeTab === 'info'       && <InfoTab />}
      </div>
    </div>
  )
}

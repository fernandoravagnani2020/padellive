import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Reservas from './pages/Reservas'
import Tournament from './pages/Tournament'
import Home from './pages/Home'
import LeaguePublic from './pages/LeaguePublic'
import LeagueAdmin from './pages/LeagueAdmin'
import SlotsData from './pages/SlotsData'

// ── Hook responsive ───────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 520)
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 520)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── Header unificado ─────────────────────────────────────
function AppHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome      = location.pathname === '/'
  const showTorneos = isHome && location.hash === '#torneos'
  const showLiga    = isHome && location.hash === '#liga'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const tabs = [
    { hash:'#reservas', label:'Reservas', active: !showTorneos && !showLiga },
    { hash:'#torneos',  label:'Torneos',  active: showTorneos },
    { hash:'#liga',     label:'Liga',     active: showLiga },
  ]

  return (
    <header style={{
      background: '#0a0a0a',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, zIndex: 100,
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      {/* Fila 1: logo + auth */}
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 16px',
        height: 54,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, flexShrink:0, minWidth:0 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:32, height:32, objectFit:'contain', flexShrink:0 }} />
          <div style={{ lineHeight:1.2 }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:'0.05em', color:'#fff', whiteSpace:'nowrap' }}>
              Negro Padel <span style={{ color:'rgba(255,255,255,0.22)' }}>&amp;</span> Encuentro
            </div>
            <div style={{ fontSize:9, letterSpacing:'0.14em', color:'rgba(255,255,255,0.28)', textTransform:'uppercase', fontWeight:600 }}>
              Reservas &amp; Torneos
            </div>
          </div>
        </a>

        <nav style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
          {user ? (
            <>
              <a href="/admin" style={{
                padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500,
                textDecoration:'none', whiteSpace:'nowrap',
                color: location.pathname==='/admin' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: location.pathname==='/admin' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.1)',
              }}>Torneos</a>
              <a href="/admin/liga" style={{
                padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500,
                textDecoration:'none', whiteSpace:'nowrap',
                color: location.pathname==='/admin/liga' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: location.pathname==='/admin/liga' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.1)',
              }}>Liga</a>
              <button onClick={handleLogout} style={{
                padding:'5px 11px', borderRadius:6, fontSize:12,
                background:'transparent', color:'rgba(255,255,255,0.25)',
                border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', fontFamily:'inherit',
                whiteSpace:'nowrap',
              }}>Salir</button>
            </>
          ) : (
            <a href="/login" style={{
              padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500,
              textDecoration:'none', color:'rgba(255,255,255,0.4)',
              border:'1px solid rgba(255,255,255,0.08)',
              whiteSpace:'nowrap',
            }}>Admin</a>
          )}
        </nav>
      </div>

      {/* Fila 2: tabs de navegación (solo en home) */}
      {isHome && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex' }}>
            {tabs.map(tab => (
              <a key={tab.hash} href={tab.hash} style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                padding:'11px 0', fontSize:13, fontWeight: tab.active ? 600 : 500,
                textDecoration:'none', whiteSpace:'nowrap',
                color: tab.active ? '#fff' : 'rgba(255,255,255,0.38)',
                borderBottom: '2px solid ' + (tab.active ? '#16a34a' : 'transparent'),
                transition:'all 0.15s',
              }}>{tab.label}</a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}


// ── Layout con header ─────────────────────────────────────
function Layout() {
  return (
    <>
      <AppHeader />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 80px' }}>
        <Outlet />
      </div>
    </>
  )
}

// ── Admin protegido ───────────────────────────────────────
function ProtectedAdmin() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <div style={{ width: 22, height: 22, border: '2px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <Admin />
}

function ProtectedAdminLiga() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <div style={{ width: 22, height: 22, border: '2px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <LeagueAdmin />
}

// ── Página principal: Reservas + Torneos + Liga ──────────
function MainPage() {
  const location = useLocation()
  const showTorneos = location.hash === '#torneos'
  const showLiga    = location.hash === '#liga'

  return (
    <>
      <AppHeader />
      {/* Reservas */}
      {!showTorneos && !showLiga && (
        <div style={{
          background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
          padding: '10px 10px calc(10px + env(safe-area-inset-bottom))',
          minHeight: 'calc(100dvh - 90px)',
        }}>
          <div style={{ maxWidth:1200, margin:'0 auto', background:'white', borderRadius:15, boxShadow:'0 10px 40px rgba(0,0,0,0.3)', overflow:'hidden' }}>
            <Reservas />
          </div>
        </div>
      )}
      {/* Torneos */}
      {showTorneos && (
        <div style={{ background:'#f8f8f8', minHeight:'calc(100dvh - 52px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px calc(80px + env(safe-area-inset-bottom))' }}>
            <Home />
          </div>
        </div>
      )}
      {/* Liga */}
      {showLiga && (
        <div style={{ background:'#f8f8f8', minHeight:'calc(100dvh - 52px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px calc(80px + env(safe-area-inset-bottom))' }}>
            <LeaguePublic />
          </div>
        </div>
      )}
    </>
  )
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/slots" element={<SlotsData />} />
          <Route path="/" element={<MainPage />} />
          <Route element={<Layout />}>
            <Route path="/torneo/:id"  element={<Tournament />} />
            <Route path="/admin"       element={<ProtectedAdmin />} />
            <Route path="/admin/liga"  element={<ProtectedAdminLiga />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

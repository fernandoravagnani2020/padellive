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
  const isMobile = useIsMobile()
  const isHome   = location.pathname === '/'
  const isAdmin  = location.pathname === '/admin'
  const showTorneos = isHome && location.hash === '#torneos'
  const showLiga    = isHome && location.hash === '#liga'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header style={{
      background: '#0a0a0a',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, zIndex: 100,
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 16px',
        height: 52,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        {/* Logo + nombre — responsive */}
        <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:0 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:28, height:28, objectFit:'contain', flexShrink:0 }} />
          <div style={{ lineHeight:1.15 }}>
            {isMobile ? (
              <>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, letterSpacing:'0.06em', color:'#fff' }}>Negro</div>
                <div style={{ fontSize:9, letterSpacing:'0.08em', color:'rgba(255,255,255,0.4)', fontWeight:500 }}>Padel &amp; Encuentro</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:15, letterSpacing:'0.05em', color:'#fff', whiteSpace:'nowrap' }}>
                  Negro Padel <span style={{ color:'rgba(255,255,255,0.25)' }}>&amp;</span> Encuentro
                </div>
                <div style={{ fontSize:8, letterSpacing:'0.14em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', fontWeight:600 }}>
                  Reservas &amp; Torneos
                </div>
              </>
            )}
          </div>
        </a>

        {/* Centro: tabs solo en home */}
        {isHome && (
          <nav style={{ display:'flex', gap:2, flexShrink:0 }}>
            {[
              { hash:'#reservas', label:'Reservas', active: !showTorneos && !showLiga },
              { hash:'#torneos',  label:'Torneos',  active: showTorneos },
              { hash:'#liga',     label:'Liga',     active: showLiga },
            ].map(tab => (
              <a key={tab.hash} href={tab.hash} style={{
                padding:'5px 10px', borderRadius:6, fontSize:12,
                fontWeight: tab.active ? 600 : 400,
                textDecoration:'none', whiteSpace:'nowrap',
                color: tab.active ? '#fff' : 'rgba(255,255,255,0.4)',
                background: tab.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: '1px solid ' + (tab.active ? 'rgba(255,255,255,0.15)' : 'transparent'),
                transition:'all 0.15s',
              }}>{tab.label}</a>
            ))}
          </nav>
        )}

        {/* Auth */}
        <nav style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
          {user ? (
            <>
              <a href="/admin" style={{
                padding:'5px 10px', borderRadius:6, fontSize:12, fontWeight:500,
                textDecoration:'none', whiteSpace:'nowrap',
                color: location.pathname==='/admin' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: location.pathname==='/admin' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.1)',
              }}>Torneos</a>
              <a href="/admin/liga" style={{
                padding:'5px 10px', borderRadius:6, fontSize:12, fontWeight:500,
                textDecoration:'none', whiteSpace:'nowrap',
                color: location.pathname==='/admin/liga' ? '#fff' : 'rgba(255,255,255,0.45)',
                background: location.pathname==='/admin/liga' ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.1)',
              }}>Liga</a>
              <button onClick={handleLogout} style={{
                padding:'5px 10px', borderRadius:6, fontSize:12,
                background:'transparent', color:'rgba(255,255,255,0.25)',
                border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', fontFamily:'inherit',
                whiteSpace:'nowrap',
              }}>Salir</button>
            </>
          ) : (
            <a href="/login" style={{
              padding:'5px 10px', borderRadius:6, fontSize:12, fontWeight:500,
              textDecoration:'none', color:'rgba(255,255,255,0.4)',
              border:'1px solid rgba(255,255,255,0.08)',
              whiteSpace:'nowrap',
            }}>Admin</a>
          )}
        </nav>
      </div>
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
          background: '#0a0a0a',
          padding: '0 0 calc(env(safe-area-inset-bottom))',
          minHeight: 'calc(100dvh - 52px)',
        }}>
          <div style={{ maxWidth:1200, margin:'0 auto', background:'white', borderRadius:0, overflow:'hidden' }}>
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

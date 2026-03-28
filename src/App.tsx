import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Reservas from './pages/Reservas'
import Tournament from './pages/Tournament'
import Home from './pages/Home'

// ── Header unificado ─────────────────────────────────────
function AppHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome   = location.pathname === '/'
  const isAdmin  = location.pathname === '/admin'
  const showTorneos = isHome && location.hash === '#torneos'

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
        {/* Logo + nombre */}
        <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:0 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:28, height:28, objectFit:'contain', flexShrink:0 }} />
          <div style={{ lineHeight:1.15, minWidth:0 }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:15, letterSpacing:'0.05em', color:'#fff', whiteSpace:'nowrap' }}>
              Negro Padel <span style={{ color:'rgba(255,255,255,0.25)' }}>&amp;</span> Encuentro
            </div>
          </div>
        </a>

        {/* Centro: tabs solo en home */}
        {isHome && (
          <nav style={{ display:'flex', gap:2, flexShrink:0 }}>
            <a href="#reservas" style={{
              padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight: showTorneos ? 400 : 600,
              textDecoration:'none', whiteSpace:'nowrap',
              color: showTorneos ? 'rgba(255,255,255,0.4)' : '#fff',
              background: showTorneos ? 'transparent' : 'rgba(255,255,255,0.1)',
              border: '1px solid ' + (showTorneos ? 'transparent' : 'rgba(255,255,255,0.15)'),
              transition:'all 0.15s',
            }}>Reservas</a>
            <a href="#torneos" style={{
              padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight: showTorneos ? 600 : 400,
              textDecoration:'none', whiteSpace:'nowrap',
              color: showTorneos ? '#fff' : 'rgba(255,255,255,0.4)',
              background: showTorneos ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: '1px solid ' + (showTorneos ? 'rgba(255,255,255,0.15)' : 'transparent'),
              transition:'all 0.15s',
            }}>Torneos</a>
          </nav>
        )}

        {/* Auth */}
        <nav style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
          {user ? (
            <>
              <a href="/admin" style={{
                padding:'5px 10px', borderRadius:6, fontSize:12, fontWeight:500,
                textDecoration:'none',
                color: isAdmin ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isAdmin ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.1)',
                whiteSpace:'nowrap',
              }}>Admin</a>
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

// ── Página principal: Reservas + Torneos ─────────────────
function MainPage() {
  const location = useLocation()
  const showTorneos = location.hash === '#torneos'

  return (
    <>
      <AppHeader />
      {/* Contenido */}
      {!showTorneos ? (
        /* ── Reservas: container blanco redondeado original ── */
        <div style={{
          background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
          padding: 10, minHeight: 'calc(100vh - 180px)',
        }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto',
            background: 'white', borderRadius: 15,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}>
            <Reservas />
          </div>
        </div>
      ) : (
        /* ── Torneos: estética blanca del proyecto ── */
        <div style={{ background: '#f8f8f8', minHeight: 'calc(100dvh - 52px)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px calc(80px + env(safe-area-inset-bottom))' }}>
            <Home />
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
      <div style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainPage />} />
          <Route element={<Layout />}>
            <Route path="/torneo/:id" element={<Tournament />} />
            <Route path="/admin"      element={<ProtectedAdmin />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

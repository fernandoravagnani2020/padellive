import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Reservas from './pages/Reservas'
import Tournament from './pages/Tournament'
import Home from './pages/Home'

// ── Header compartido (estética torneos) ──────────────────
function AppHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const isAdmin = location.pathname === '/admin'
  const isHome  = location.pathname === '/'

  return (
    <header style={{
      background: isHome ? 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)' : '#fff',
      borderBottom: isHome ? 'none' : '1px solid rgba(0,0,0,0.08)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{
        maxWidth: isHome ? '100%' : 960, margin: '0 auto', padding: isHome ? '16px 20px' : '0 16px',
        height: isHome ? 'auto' : 54,
        display: 'flex', flexDirection: isHome ? 'column' : 'row',
        alignItems: 'center', justifyContent: isHome ? 'center' : 'space-between',
        gap: isHome ? 10 : 0,
        textAlign: isHome ? 'center' : 'left',
      }}>
        {/* Logo + nombre */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: isHome ? 20 : 10 }}>
          <img
            src="/logo.png"
            alt="Negro Padel"
            style={{
              width: isHome ? 70 : 34,
              height: isHome ? 70 : 34,
              objectFit: 'contain', flexShrink: 0,
              ...(!isHome ? { borderRadius: 6, mixBlendMode: 'multiply' as React.CSSProperties['mixBlendMode'] } : {})
            }}
          />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isHome ? 'clamp(1.2em, 4vw, 1.8em)' : 17,
              letterSpacing: isHome ? 3 : 2,
              fontWeight: isHome ? 300 : 600,
              color: isHome ? '#fff' : '#111',
              textTransform: 'uppercase',
            }}>
              PADEL Y ENCUENTRO
            </div>
            {isHome && (
              <div style={{ fontSize: '0.9em', opacity: 0.7, fontWeight: 300, letterSpacing: 1, color: '#fff' }}>
                Reservá tu turno en segundos
              </div>
            )}
            {!isHome && (
              <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#bbb', textTransform: 'uppercase', fontWeight: 600 }}>
                Reservas &amp; Torneos
              </div>
            )}
          </div>
        </a>

        {/* Nav — solo visible fuera de la home */}
        {!isHome && (
          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {user ? (
              <>
                <a href="/admin" style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                  color: isAdmin ? '#111' : '#666',
                  background: isAdmin ? 'rgba(0,0,0,0.07)' : 'transparent',
                  border: '1px solid rgba(0,0,0,0.1)',
                }}>Admin</a>
                <button onClick={handleLogout} style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  background: 'transparent', color: '#bbb',
                  border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', fontFamily: 'inherit',
                }}>Salir</button>
              </>
            ) : (
              <a href="/login" style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                textDecoration: 'none', color: '#888', border: '1px solid rgba(0,0,0,0.1)',
              }}>Admin</a>
            )}
          </nav>
        )}
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
      {/* Tabs */}
      <div style={{ display: 'flex', background: '#111', borderBottom: '2px solid #222' }}>
        {[
          { hash: '#reservas', icon: '🎾', label: 'RESERVAS', active: !showTorneos },
          { hash: '#torneos',  icon: '🏆', label: 'TORNEOS',  active: showTorneos  },
        ].map(tab => (
          <a key={tab.hash} href={tab.hash} style={{
            flex: 1, padding: '14px 10px', textAlign: 'center',
            color: tab.active ? '#fff' : 'rgba(255,255,255,0.45)',
            fontWeight: 700, letterSpacing: 2, fontSize: '0.85em', textTransform: 'uppercase',
            textDecoration: 'none',
            borderBottom: tab.active ? '3px solid #fff' : '3px solid transparent',
            background: tab.active ? 'rgba(255,255,255,0.06)' : 'transparent',
            transition: 'all 0.2s',
          } as React.CSSProperties}>
            <span style={{ display: 'block', fontSize: '1.3em', marginBottom: 3 }}>{tab.icon}</span>
            {tab.label}
          </a>
        ))}
      </div>

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
        <div style={{ background: '#f8f8f8', minHeight: 'calc(100vh - 120px)' }}>
          <AppHeader />
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 80px' }}>
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

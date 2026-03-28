import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Reservas from './pages/Reservas'
import Tournament from './pages/Tournament'
import Home from './pages/Home'

function Layout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  )
}

function ProtectedAdmin() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:200 }}>
      <div style={{ width:22, height:22, border:'2px solid #16a34a', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <Admin />
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh', background:'#000' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/"           element={<MainPage />} />
            <Route path="/torneo/:id" element={<Tournament />} />
            <Route path="/admin"      element={<ProtectedAdmin />} />
            <Route path="/torneos"    element={<TorneosPage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// ── Página principal con tabs Reservas / Torneos ──────────

function MainPage() {
  const location = useLocation()
  const hash = location.hash
  const showTorneos = hash === '#torneos'

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', background:'#111', borderBottom:'2px solid #222' }}>
        {[
          { hash:'#reservas', icon:'🎾', label:'RESERVAS', active: !showTorneos },
          { hash:'#torneos',  icon:'🏆', label:'TORNEOS',  active: showTorneos  },
        ].map(tab => (
          <a key={tab.hash} href={tab.hash} style={{
            flex:1, padding:'14px 10px', textAlign:'center' as const,
            color: tab.active ? '#fff' : 'rgba(255,255,255,0.45)',
            fontWeight:700, letterSpacing:2, fontSize:'0.85em', textTransform:'uppercase' as const,
            textDecoration:'none', borderBottom: tab.active ? '3px solid #fff' : '3px solid transparent',
            background: tab.active ? 'rgba(255,255,255,0.06)' : 'transparent',
            transition:'all 0.2s',
          }}>
            <span style={{ display:'block', fontSize:'1.3em', marginBottom:3 }}>{tab.icon}</span>
            {tab.label}
          </a>
        ))}
      </div>

      {/* Contenido */}
      {!showTorneos ? (
        <Reservas />
      ) : (
        <TorneosPage />
      )}
    </div>
  )
}

// ── Página de torneos (lista de torneos) ──────────────────

function TorneosPage() {
  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px 80px' }}>
      <Home />
    </div>
  )
}

// ── Header ────────────────────────────────────────────────

function AppHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    window.location.href = '/'
  }

  const isAdmin = location.pathname === '/admin'

  return (
    <header style={{ background:'#000', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:34, height:34, borderRadius:6, objectFit:'cover', flexShrink:0 }} />
          <div style={{ lineHeight:1.15 }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:17, letterSpacing:'0.05em', color:'#fff' }}>
              Negro Padel <span style={{ color:'rgba(255,255,255,0.3)' }}>&amp;</span> Encuentro
            </div>
            <div style={{ fontSize:9, letterSpacing:'0.14em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', fontWeight:600 }}>
              Reservas &amp; Torneos
            </div>
          </div>
        </a>

        <nav style={{ display:'flex', gap:4, alignItems:'center' }}>
          {user ? (
            <>
              <a href="/admin" style={{
                padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
                textDecoration:'none', color: isAdmin ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isAdmin ? 'rgba(255,255,255,0.1)' : 'transparent',
                border:'1px solid rgba(255,255,255,0.12)',
              }}>Admin</a>
              <button onClick={handleLogout} style={{
                padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
                background:'transparent', color:'rgba(255,255,255,0.3)',
                border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', fontFamily:'inherit',
              }}>Salir</button>
            </>
          ) : (
            <a href="/login" style={{
              padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
              textDecoration:'none', color:'rgba(255,255,255,0.4)',
              border:'1px solid rgba(255,255,255,0.1)',
            }}>Admin</a>
          )}
        </nav>
      </div>
    </header>
  )
}

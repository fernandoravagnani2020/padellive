import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header style={{ background:'#fff', borderBottom:'1px solid rgba(0,0,0,0.08)', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="Negro Padel" style={{ width:34, height:34, borderRadius:6, objectFit:'cover', flexShrink:0, border:'1px solid rgba(0,0,0,0.08)' }} />
          <div style={{ lineHeight:1.15 }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:17, letterSpacing:'0.05em', color:'#111' }}>
              Negro Padel <span style={{ color:'#ccc' }}>&amp;</span> Encuentro
            </div>
            <div style={{ fontSize:9, letterSpacing:'0.14em', color:'#bbb', textTransform:'uppercase', fontWeight:600 }}>
              Torneos
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display:'flex', gap:4, alignItems:'center' }}>
          <Link to="/" style={{
            padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
            textDecoration:'none', color: pathname === '/' ? '#111' : '#666',
            background: pathname === '/' ? 'rgba(0,0,0,0.07)' : 'transparent',
            border:'1px solid transparent',
          }}>
            Torneos
          </Link>

          {user ? (
            <>
              <Link to="/admin" style={{
                padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
                textDecoration:'none',
                color: pathname === '/admin' ? '#111' : '#666',
                background: pathname === '/admin' ? 'rgba(0,0,0,0.07)' : 'transparent',
                border:'1px solid rgba(0,0,0,0.1)',
              }}>
                Admin
              </Link>
              <button onClick={handleLogout} style={{
                padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
                background:'transparent', color:'#bbb', border:'1px solid rgba(0,0,0,0.08)',
                cursor:'pointer', fontFamily:'inherit',
              }}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" style={{
              padding:'5px 12px', borderRadius:7, fontSize:13, fontWeight:500,
              textDecoration:'none', color:'#888', border:'1px solid rgba(0,0,0,0.1)',
            }}>
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

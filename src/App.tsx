import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Tournament from './pages/Tournament'
import Admin from './pages/Admin'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'

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
      <div style={{ minHeight:'100vh', background:'#f8f8f8' }}>
        <Routes>
          {/* Login sin header */}
          <Route path="/login" element={<Login />} />

          {/* Resto con header */}
          <Route path="*" element={
            <>
              <Header />
              <main style={{ maxWidth:960, margin:'0 auto', padding:'0 16px 80px' }}>
                <Routes>
                  <Route path="/"           element={<Home />} />
                  <Route path="/torneo/:id" element={<Tournament />} />
                  <Route path="/admin"      element={<ProtectedAdmin />} />
                </Routes>
              </main>
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

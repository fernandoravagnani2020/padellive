import { useEffect, useState } from 'react'
import { getPushSupport, isSubscribed, subscribePush, unsubscribePush } from '../lib/push'

// Banner discreto que se muestra una vez para invitar a activar notificaciones.
// Aparece después de unos segundos y solo si el browser soporta y aún no se decidió.
export default function PushPrompt() {
  const [show,    setShow]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('push_prompt_dismissed') === '1')

  useEffect(() => {
    if (dismissed) return
    let cancelled = false

    async function check() {
      const support = getPushSupport()
      if (support === 'unsupported' || support === 'denied') return
      if (support === 'granted') {
        // Si ya dijo que sí pero no está suscrito (puede pasar tras reinstalar), suscribir silenciosamente
        const sub = await isSubscribed()
        if (!sub) await subscribePush()
        return
      }
      // support === 'default' → mostrar banner tras 5s
      setTimeout(() => { if (!cancelled) setShow(true) }, 5000)
    }
    check()
    return () => { cancelled = true }
  }, [dismissed])

  async function activate() {
    setBusy(true)
    const result = await subscribePush()
    setBusy(false)
    if (result.ok) {
      setShow(false)
    } else {
      alert((result as { ok: false; error: string }).error)
    }
  }

  function dismiss() {
    localStorage.setItem('push_prompt_dismissed', '1')
    setShow(false)
    setDismissed(true)
  }

  if (!show) return null

  return (
    <div style={{
      position:'fixed', bottom:16, left:16, right:16,
      maxWidth:420, margin:'0 auto', zIndex:1000,
      background:'#0a0a0a',
      border:'1px solid rgba(22,163,74,0.35)',
      borderRadius:14,
      padding:14,
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', gap:12,
      paddingBottom: `calc(14px + env(safe-area-inset-bottom))`,
    }}>
      <div style={{
        width:40, height:40, borderRadius:10,
        background:'rgba(22,163,74,0.15)',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <span style={{ fontSize:22 }}>🔔</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:'#fff', fontWeight:700, fontSize:13, marginBottom:2 }}>Activá notificaciones</div>
        <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11, lineHeight:1.3 }}>
          Te avisamos al toque cuando se carga el resultado de un partido.
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
        <button onClick={activate} disabled={busy} style={{
          background:'#16a34a', color:'#fff', border:'none', borderRadius:8,
          padding:'7px 12px', fontSize:11, fontWeight:700, cursor:'pointer',
          fontFamily:'inherit', whiteSpace:'nowrap',
        }}>
          {busy ? 'Activando…' : 'Activar'}
        </button>
        <button onClick={dismiss} style={{
          background:'transparent', color:'rgba(255,255,255,0.4)',
          border:'none', padding:'4px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit',
        }}>
          Ahora no
        </button>
      </div>
    </div>
  )
}

// Toggle settings — se puede mostrar en alguna pantalla de admin / perfil
export function PushToggle() {
  const [subscribed, setSubscribed] = useState(false)
  const [support, setSupport] = useState(getPushSupport())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    isSubscribed().then(setSubscribed)
    setSupport(getPushSupport())
  }, [])

  if (support === 'unsupported') return null

  async function toggle() {
    setBusy(true)
    if (subscribed) {
      await unsubscribePush()
      setSubscribed(false)
      localStorage.removeItem('push_prompt_dismissed')
    } else {
      const r = await subscribePush()
      if (r.ok) setSubscribed(true)
      else alert((r as { ok: false; error: string }).error)
    }
    setBusy(false)
  }

  return (
    <button onClick={toggle} disabled={busy} style={{
      background: subscribed ? 'rgba(22,163,74,0.15)' : 'transparent',
      color: subscribed ? '#16a34a' : 'rgba(255,255,255,0.6)',
      border: `1px solid ${subscribed ? 'rgba(22,163,74,0.35)' : 'rgba(255,255,255,0.15)'}`,
      borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700,
      cursor:'pointer', fontFamily:'inherit',
    }}>
      {busy ? '...' : subscribed ? '🔔 Notificaciones activas' : '🔕 Activar notificaciones'}
    </button>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Service Worker con auto-actualización ───────────────────────────────────
// Registra el SW y, cuando se publica una versión nueva, recarga la página
// automáticamente (sin necesidad de hard refresh). Además chequea updates al
// volver a la pestaña y cada 60s para PWAs/pestañas de larga duración.
if ('serviceWorker' in navigator) {
  // ¿Ya había un SW controlando al cargar? Si sí, un cambio de controlador
  // significa que entró una versión NUEVA → recargamos. En la primera
  // instalación (sin controlador previo) no recargamos.
  const startedControlled = !!navigator.serviceWorker.controller
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !startedControlled) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      const checkForUpdate = () => { reg.update().catch(() => {}) }
      // Al volver el foco a la app.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      // Y periódicamente mientras está abierta.
      setInterval(checkForUpdate, 60_000)
    }).catch(() => {})
  })
}

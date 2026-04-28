/// <reference lib="webworker" />

// Service Worker custom para Negro Padel
// - Caché de assets estáticos (precache de Workbox via injectManifest)
// - Network-first para navegación / HTML
// - Manejo de push notifications

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// ── Precache de assets buildeados (lo inyecta vite-plugin-pwa) ────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Estrategia para HTML / navegación: network-first con fallback ─────────
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
    }),
  ),
)

// ── Fonts de Google: cache-first con expiración ───────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

// ── Imágenes (logos, íconos): SWR ─────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// ── Activación inmediata sin esperar tabs viejos ──────────────────────────
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))


// ════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════

interface PushPayload {
  title: string
  body: string
  url?: string       // a dónde llevar al hacer click
  tag?: string       // para agrupar/reemplazar notifs
  icon?: string
}

self.addEventListener('push', event => {
  let payload: PushPayload = {
    title: 'Negro Padel',
    body: 'Hay novedades en el torneo',
  }

  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    if (event.data) payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag ?? 'negropadel',
      data: { url: payload.url ?? '/' },
      // @ts-expect-error vibrate existe en runtime
      vibrate: [120, 60, 120],
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Si hay una pestaña abierta de la app, enfocarla y navegar
    const existing = allClients.find(c => c.url.includes(self.location.origin))
    if (existing) {
      await existing.focus()
      if ('navigate' in existing) await (existing as WindowClient).navigate(targetUrl)
      return
    }
    await self.clients.openWindow(targetUrl)
  })())
})

export {}

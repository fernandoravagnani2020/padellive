// Helpers de Web Push
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

// Convertir base64 url-safe a Uint8Array (lo que necesita pushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const arr     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary  = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export type PushSupport = 'unsupported' | 'denied' | 'default' | 'granted'

export function getPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window))      return 'unsupported'
  if (!('Notification' in window))     return 'unsupported'
  return Notification.permission as PushSupport
}

// Suscribe al usuario y guarda la suscripción en Supabase
export async function subscribePush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'VAPID_PUBLIC_KEY no configurada' }

  const support = getPushSupport()
  if (support === 'unsupported') return { ok: false, error: 'Tu navegador no soporta notificaciones' }
  if (support === 'denied')      return { ok: false, error: 'Notificaciones bloqueadas. Activalas desde ajustes.' }

  // Pedir permiso si todavía no se otorgó
  if (support === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, error: 'Permiso denegado' }
  }

  const registration = await navigator.serviceWorker.ready

  // Si ya tenía una suscripción, la reusamos
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  // Guardar en Supabase (upsert por endpoint)
  const json    = subscription.toJSON()
  const p256dh  = json.keys?.p256dh ?? arrayBufferToBase64(subscription.getKey('p256dh'))
  const auth    = json.keys?.auth   ?? arrayBufferToBase64(subscription.getKey('auth'))

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint:   subscription.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function unsubscribePush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

export async function isSubscribed(): Promise<boolean> {
  if (getPushSupport() !== 'granted') return false
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

// Mandar un push (lo dispara la Edge Function de Supabase)
export async function sendMatchPush(opts: {
  title: string
  body:  string
  url?:  string
  tag?:  string
}): Promise<void> {
  await supabase.functions.invoke('send-match-push', { body: opts })
}

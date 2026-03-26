import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Detectar iframe
const isInIframe = (() => {
  try { return window.self !== window.top } catch { return true }
})()

export { isInIframe }

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    realtime: {
      params: { eventsPerSecond: isInIframe ? 0 : 10 },
    },
  }
)

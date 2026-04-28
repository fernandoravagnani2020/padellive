// Supabase Edge Function (Deno) — manda Web Push a todos los suscriptos
// Deploy:  supabase functions deploy send-match-push
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY          = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY         = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT             = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hola@negropadel.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Body {
  title: string
  body:  string
  url?:  string
  tag?:  string
  icon?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload: Body = await req.json()
    if (!payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: 'title y body son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: subs, error } = await supa
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')

    if (error) throw error
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'sin suscriptos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = JSON.stringify(payload)
    const expiredEndpoints: string[] = []
    let sent = 0

    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, data)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // 404 / 410 → suscripción expirada o cancelada — borrar de la base
        if (status === 404 || status === 410) {
          expiredEndpoints.push(s.endpoint)
        } else {
          console.error(`Push error a ${s.endpoint}:`, err)
        }
      }
    }))

    if (expiredEndpoints.length) {
      await supa.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    }

    return new Response(JSON.stringify({
      sent, total: subs.length, removed: expiredEndpoints.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

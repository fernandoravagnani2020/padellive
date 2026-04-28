#!/usr/bin/env python3
"""
notify_slots.py — Manda un push notification con los turnos disponibles del día
desde las 14:30, llamando a la Edge Function de Supabase 'send-match-push'.

Uso:
    python3 notify_slots.py

Requiere variables de entorno:
    SUPABASE_URL          (ej: https://xxxxx.supabase.co)
    SUPABASE_ANON_KEY
"""

import os
import sys
import requests
from datetime import datetime, timedelta, timezone

# ── Hora Argentina ───────────────────────────────────────────────────────────
ART = timezone(timedelta(hours=-3))
def now_art() -> datetime:
    return datetime.now(ART).replace(tzinfo=None)

# ── API de turnos (Google Sheets) ────────────────────────────────────────────
API_URL = (
    'https://script.google.com/macros/s/'
    'AKfycbyd4O4dWAUnUgGeyok35PCeGSRAbxLu4uLfh6_WQQiOYSREVlkX6Dpru7sI3Fiuusn0/exec'
)
TIME_SLOTS  = ['09:30','11:00','12:30','14:30','16:00','17:30','19:00','20:30','22:00']
DIAS_FDS    = ['SÁBADO', 'DOMINGO']
HORA_INICIO = '14:30'

def _slot_end(fecha: str, hora: str) -> datetime:
    y, m, d = map(int, fecha.split('-'))
    h, mn   = map(int, hora.split(':'))
    return datetime(y, m, d, h, mn) + timedelta(minutes=90)

def turno_finalizado(fecha, hora): return now_art() > _slot_end(fecha, hora)
def turno_en_curso(fecha, hora):
    ini = _slot_end(fecha, hora) - timedelta(minutes=90)
    return ini <= now_art() <= _slot_end(fecha, hora)

def get_price(precios, dia, hora):
    if not precios: return 20000
    bloque = precios.get('finDeSemana' if dia in DIAS_FDS else 'semana', {})
    return bloque.get(hora, 20000)

def fmt_price(n: int) -> str:
    return f"${n:,}".replace(",", ".")


def fetch_libre_slots():
    resp = requests.get(f"{API_URL}?action=getTodo", timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if not data.get('success'):
        raise RuntimeError(data.get('error', 'API devolvió error'))

    api  = data['data']
    hoy  = now_art().date()
    out  = []

    for day in api.get('week', []):
        fecha = f"{day['year']}-{day['month'].zfill(2)}-{day['date'].zfill(2)}"
        if datetime.strptime(fecha, '%Y-%m-%d').date() != hoy:
            continue
        for hora in TIME_SLOTS:
            if hora < HORA_INICIO: continue
            if turno_en_curso(fecha, hora) or turno_finalizado(fecha, hora): continue
            if day['slots'].get(hora): continue
            out.append({
                'hora': hora,
                'precio': get_price(api.get('precios'), day['day'], hora),
            })
    return out


def send_push(title: str, body: str, url: str = '/', tag: str = 'turnos-diarios'):
    supa_url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    anon_key = os.environ.get('SUPABASE_ANON_KEY', '')

    if not supa_url or not anon_key:
        print('Error: faltan SUPABASE_URL / SUPABASE_ANON_KEY', file=sys.stderr)
        sys.exit(1)

    endpoint = f"{supa_url}/functions/v1/send-match-push"
    resp = requests.post(
        endpoint,
        headers={
            'Authorization': f'Bearer {anon_key}',
            'apikey':        anon_key,
            'Content-Type':  'application/json',
        },
        json={'title': title, 'body': body, 'url': url, 'tag': tag},
        timeout=30,
    )
    resp.raise_for_status()
    print(f"✓ Push enviado: {resp.json()}")


if __name__ == '__main__':
    print(f"[{now_art().strftime('%Y-%m-%d %H:%M')}] Buscando turnos libres del día desde {HORA_INICIO}...")
    try:
        libres = fetch_libre_slots()
    except Exception as e:
        print(f"Error consultando API: {e}", file=sys.stderr)
        sys.exit(1)

    if not libres:
        print("No hay turnos libres hoy desde 14:30 — no se envía push.")
        sys.exit(0)

    horas_str = ' · '.join(s['hora'] + ' hs' for s in libres)
    title     = f"🎾 {len(libres)} turno{'s' if len(libres) > 1 else ''} disponible{'s' if len(libres) > 1 else ''} hoy"
    body      = f"{horas_str}. Reservá por WhatsApp."

    print(f"Title: {title}")
    print(f"Body:  {body}")

    try:
        send_push(title, body, url='/')
    except Exception as e:
        print(f"Error enviando push: {e}", file=sys.stderr)
        sys.exit(1)

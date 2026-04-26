#!/usr/bin/env python3
"""
genera_flyer.py — Genera imagen de turnos disponibles a partir de la plantilla.

Muestra los turnos libres de HOY a partir de las 14:30.

Uso:
    python3 genera_flyer.py                  # guarda en ./flyers/turnos_YYYY-MM-DD.png
    python3 genera_flyer.py --out flyer.png  # ruta personalizada

Requiere: pip install Pillow requests
"""

import requests
import sys
import os
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont

# ── Rutas ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
TEMPLATE   = os.path.join(BASE_DIR, 'public', 'Plantilla turnos.PNG')
OUTPUT_DIR = os.path.join(BASE_DIR, 'flyers')
FONT_BLACK = '/Users/fernandoravagnani/Library/Fonts/CamptonBlack.otf'
FONT_BOLD  = '/Users/fernandoravagnani/Library/Fonts/CamptonBold.otf'

# ── API ───────────────────────────────────────────────────────────────────────
API_URL = (
    'https://script.google.com/macros/s/'
    'AKfycbyd4O4dWAUnUgGeyok35PCeGSRAbxLu4uLfh6_WQQiOYSREVlkX6Dpru7sI3Fiuusn0/exec'
)
TIME_SLOTS  = ['09:30','11:00','12:30','14:30','16:00','17:30','19:00','20:30','22:00']
DIAS_FDS    = ['SÁBADO', 'DOMINGO']
MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

HORA_INICIO = '14:30'   # primer turno a incluir en el flyer

# ── Área de la grilla en la plantilla (814×1446 px) ───────────────────────────
GRID = dict(x1=60, y1=220, x2=754, y2=1062)
GRID_W = GRID['x2'] - GRID['x1']   # 694 px
GRID_H = GRID['y2'] - GRID['y1']   # 842 px
PAD_X  = 50
PAD_Y  = 30

# ── Colores ───────────────────────────────────────────────────────────────────
LIME    = (195, 249, 80)
WHITE   = (255, 255, 255)
DIVIDER = (60, 88, 62)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _slot_end(fecha: str, hora: str) -> datetime:
    y, m, d = map(int, fecha.split('-'))
    h, mn   = map(int, hora.split(':'))
    return datetime(y, m, d, h, mn) + timedelta(minutes=90)

def turno_finalizado(fecha: str, hora: str) -> bool:
    return datetime.now() > _slot_end(fecha, hora)

def turno_en_curso(fecha: str, hora: str) -> bool:
    ini = _slot_end(fecha, hora) - timedelta(minutes=90)
    return ini <= datetime.now() <= _slot_end(fecha, hora)

def get_price(precios, dia: str, hora: str) -> int:
    if not precios:
        return 20000
    bloque = precios.get('finDeSemana' if dia in DIAS_FDS else 'semana', {})
    return bloque.get(hora, 20000)

def fmt_price(n: int) -> str:
    return f"${n:,}".replace(",", ".")


# ── Fetch ─────────────────────────────────────────────────────────────────────
def fetch_api() -> dict:
    resp = requests.get(f"{API_URL}?action=getTodo", timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if not data.get('success'):
        raise RuntimeError(data.get('error', 'API devolvió error'))
    return data['data']

def get_libre_slots(api_data: dict) -> list:
    """Devuelve los turnos libres de HOY a partir de HORA_INICIO."""
    precios = api_data.get('precios')
    hoy     = datetime.now().date()
    slots   = []

    for day in api_data.get('week', []):
        fecha = f"{day['year']}-{day['month'].zfill(2)}-{day['date'].zfill(2)}"

        # Solo hoy
        if datetime.strptime(fecha, '%Y-%m-%d').date() != hoy:
            continue

        for hora in TIME_SLOTS:
            if hora < HORA_INICIO:
                continue
            if turno_en_curso(fecha, hora) or turno_finalizado(fecha, hora):
                continue
            if day['slots'].get(hora):
                continue
            slots.append({
                'dia'   : day['day'],
                'fecha' : fecha,
                'date'  : day['date'],
                'month' : day['month'],
                'hora'  : hora,
                'precio': get_price(precios, day['day'], hora),
            })

    return slots


# ── Imagen ────────────────────────────────────────────────────────────────────
def generate_flyer(slots: list, output_path: str) -> None:
    img  = Image.open(TEMPLATE).convert('RGBA')
    draw = ImageDraw.Draw(img)

    cx = GRID['x1'] + GRID_W // 2   # centro horizontal de la grilla

    # ── Sin turnos disponibles ──────────────────────────────────────────────
    if not slots:
        fnt = ImageFont.truetype(FONT_BOLD, 38)
        draw.text(
            (cx, GRID['y1'] + GRID_H // 2),
            'SIN TURNOS\nDISPONIBLES',
            font=fnt, fill=LIME, anchor='mm', align='center',
        )
        _save(img, output_path)
        return

    # ── Fecha del día (encabezado dentro de la grilla) ───────────────────────
    s0  = slots[0]
    mes = MONTH_NAMES[int(s0['month']) - 1]
    fecha_label = f"{s0['dia']}  {s0['date']} DE {mes.upper()}"

    # ── Calcular tamaños dinámicos según cantidad de slots ───────────────────
    # Filas: 1 header de fecha + N slots
    n_rows = 1 + len(slots)
    area_h = GRID_H - PAD_Y * 2

    # Tamaños de fuente ajustados al espacio disponible
    if len(slots) <= 3:
        sz_fecha, sz_hora, sz_precio = 38, 72, 48
    elif len(slots) <= 5:
        sz_fecha, sz_hora, sz_precio = 34, 62, 42
    else:
        sz_fecha, sz_hora, sz_precio = 30, 52, 36

    row_h   = min(area_h // n_rows, 120)
    total_h = n_rows * row_h
    y       = GRID['y1'] + PAD_Y + max(0, (area_h - total_h) // 2)

    x_left  = GRID['x1'] + PAD_X
    x_right = GRID['x2'] - PAD_X

    fnt_fecha  = ImageFont.truetype(FONT_BOLD,  sz_fecha)
    fnt_hora   = ImageFont.truetype(FONT_BLACK, sz_hora)
    fnt_precio = ImageFont.truetype(FONT_BOLD,  sz_precio)

    # ── Encabezado: nombre del día y fecha ───────────────────────────────────
    draw.text(
        (cx, y + row_h // 2),
        fecha_label,
        font=fnt_fecha, fill=LIME, anchor='mm',
    )
    y += row_h

    # Línea divisora debajo del header
    draw.line([(x_left, y - 6), (x_right, y - 6)], fill=DIVIDER, width=1)

    # ── Filas de turnos ───────────────────────────────────────────────────────
    for slot in slots:
        cy = y + row_h // 2
        # Hora a la izquierda (grande, blanco)
        draw.text((x_left, cy), slot['hora'], font=fnt_hora, fill=WHITE, anchor='lm')
        # Precio a la derecha (verde lima)
        draw.text((x_right, cy), fmt_price(slot['precio']), font=fnt_precio, fill=LIME, anchor='rm')
        y += row_h

    _save(img, output_path)
    print(f"✓ Flyer guardado: {output_path}")
    print(f"  {len(slots)} turno(s) libre(s) para hoy desde {HORA_INICIO}")


def _save(img, path: str) -> None:
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    img.save(path)


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    out = None
    if '--out' in sys.argv:
        idx = sys.argv.index('--out')
        if idx + 1 < len(sys.argv):
            out = sys.argv[idx + 1]
    if out is None:
        fecha_hoy = datetime.now().strftime('%Y-%m-%d')
        out = os.path.join(OUTPUT_DIR, f'turnos_{fecha_hoy}.png')

    print('Obteniendo turnos desde la API...')
    try:
        api_data = fetch_api()
        slots    = get_libre_slots(api_data)
        print(f"Turnos libres hoy desde {HORA_INICIO}: {len(slots)}")
        generate_flyer(slots, out)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

import zlib
import struct
import math

def create_png(width, height, get_pixel_func):
    """Encodes a width x height RGBA image into a valid PNG file bytes."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), 9)
    
    def chunk(tag, data):
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = compressed
    
    return header + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

def render_icon_pixel(x, y, w, h, is_maskable=False):
    # Normalized coords from 0.0 to 1.0
    nx = x / float(w)
    ny = y / float(h)
    
    # Background teal: #0f766e (15, 118, 110)
    # White: (255, 255, 255)
    # Amber: #f59e0b (245, 158, 11)
    
    # Corner radius for non-maskable:
    if not is_maskable:
        # Check rounded corners with radius 0.18
        r = 0.18
        if (nx < r and ny < r and math.hypot(nx - r, ny - r) > r) or \
           (nx > 1 - r and ny < r and math.hypot(nx - (1 - r), ny - r) > r) or \
           (nx < r and ny > 1 - r and math.hypot(nx - r, ny - (1 - r)) > r) or \
           (nx > 1 - r and ny > 1 - r and math.hypot(nx - (1 - r), ny - (1 - r)) > r):
            return (0, 0, 0, 0) # transparent
            
    # Base background: Deep Teal
    r_val, g_val, b_val, a_val = 15, 118, 110, 255
    
    # Building Body: x in [0.27, 0.73], y in [0.27, 0.78]
    scale = 0.82 if is_maskable else 1.0
    cx, cy = 0.5, 0.5
    bx = (nx - cx) / scale + cx
    by = (ny - cy) / scale + cy
    
    if 0.28 <= bx <= 0.72 and 0.28 <= by <= 0.78:
        # Building surface (white)
        r_val, g_val, b_val = 245, 247, 250
        
        # Windows: 2 rows of 3 windows
        # row 1: y in [0.35, 0.43]
        # row 2: y in [0.47, 0.55]
        # cols: [0.35, 0.42], [0.47, 0.54], [0.59, 0.66]
        in_win_y = (0.35 <= by <= 0.42) or (0.47 <= by <= 0.54)
        in_win_x = (0.35 <= bx <= 0.42) or (0.465 <= bx <= 0.535) or (0.58 <= bx <= 0.65)
        if in_win_y and in_win_x:
            r_val, g_val, b_val = 15, 118, 110
            
        # Doorway at bottom: bx in [0.45, 0.55], by in [0.63, 0.78]
        if 0.45 <= bx <= 0.55 and 0.63 <= by <= 0.78:
            r_val, g_val, b_val = 15, 118, 110
            
    # Golden Rupee Coin Badge at top right: center at (0.70, 0.30), radius 0.12
    coin_cx, coin_cy = 0.5 + 0.20 * scale, 0.5 - 0.20 * scale
    coin_r = 0.12 * scale
    dist_coin = math.hypot(nx - coin_cx, ny - coin_cy)
    
    if dist_coin <= coin_r:
        if dist_coin >= coin_r - 0.015 * scale:
            r_val, g_val, b_val = 255, 255, 255 # White border
        else:
            r_val, g_val, b_val = 245, 158, 11 # Amber gold
            # Rupee bar and curve
            rel_x = (nx - coin_cx) / coin_r
            rel_y = (ny - coin_cy) / coin_r
            # Rupee symbol approximate mark
            if -0.45 <= rel_x <= 0.45 and (-0.35 <= rel_y <= -0.22 or -0.08 <= rel_y <= 0.05):
                r_val, g_val, b_val = 255, 255, 255
            elif -0.35 <= rel_x <= -0.15 and -0.35 <= rel_y <= 0.45:
                r_val, g_val, b_val = 255, 255, 255
            elif 0.0 <= rel_x <= 0.45 and rel_y > 0.05 and abs(rel_x - rel_y) < 0.18:
                r_val, g_val, b_val = 255, 255, 255
                
    return (r_val, g_val, b_val, a_val)

# Generate icons
with open('/app/applet/public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, lambda x, y, w, h: render_icon_pixel(x, y, w, h, False)))

with open('/app/applet/public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, lambda x, y, w, h: render_icon_pixel(x, y, w, h, False)))

with open('/app/applet/public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, lambda x, y, w, h: render_icon_pixel(x, y, w, h, True)))

with open('/app/applet/public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, lambda x, y, w, h: render_icon_pixel(x, y, w, h, False)))

print("PNG icons generated successfully!")

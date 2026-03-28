# HeoLab Logo PNG Export — Design Doc

**Goal:** Create a Next.js API route that generates the HeoLab logo as a downloadable PNG, for use in branding (social media, press kit, etc.).

**Approach:** Next.js API route using `ImageResponse` from `next/og` (Edge runtime). Same pattern as `src/app/opengraph-image.tsx`.

---

## Route

**File:** `src/app/api/logo.png/route.ts`

**URL:** `/api/logo.png`

**Method:** GET

**Returns:** `image/png`

---

## Query Parameters

| Param | Options | Default | Description |
|-------|---------|---------|-------------|
| `size` | `256`, `512`, `1024` | `512` | Canvas size in px (square) |
| `variant` | `dark`, `light` | `dark` | Color scheme |

### Variants

- **dark** — background `#0a0a0a`, text white, brackets neon green `#39ff14`, dot grid overlay
- **light** — background `#f5f5f5`, text `#0a0a0a`, brackets neon green `#39ff14`, no dot grid

---

## Visual Layout

Square canvas (default 512x512):

```
┌─────────────────────────┐
│  · · · · · · · · · · ·  │  dot grid overlay (dark variant only)
│                         │
│      <  HeoLab  />      │  brackets neon green, text white/dark
│                         │
│    Play. Explore. Fun.  │  tagline, neon green, smaller font
│                         │
└─────────────────────────┘
```

### Typography (at 512px)

- Brackets `<` and `/>`: 48px bold, color `#39ff14`
- `HeoLab`: 72px bold, color white (dark) / `#0a0a0a` (light)
- Tagline: 18px, color `#39ff14`
- Font family: `sans-serif` (ImageResponse default — Press Start 2P not available in edge runtime)

### Dot Grid (dark only)

```
radial-gradient(circle, rgba(57,255,20,0.12) 1px, transparent 1px)
background-size: 24px 24px
```

---

## Usage Examples

```
/api/logo.png                        512x512 dark
/api/logo.png?size=1024              1024x1024 dark
/api/logo.png?size=256               256x256 dark
/api/logo.png?variant=light          512x512 light
/api/logo.png?size=1024&variant=light 1024x1024 light
```

---

## Implementation Notes

- Use `EdgeRuntime` — set `export const runtime = "edge"`
- Read `size` and `variant` from `request.url` searchParams
- Clamp size to allowed values: `[256, 512, 1024]`, default `512`
- Scale font sizes proportionally to size: base sizes defined at 512px, multiply by `size/512`
- Return `new ImageResponse(...)` with correct `Content-Type: image/png` header (handled automatically by ImageResponse)
- No new npm dependencies needed

---

## Files

- Create: `src/app/api/logo.png/route.ts`

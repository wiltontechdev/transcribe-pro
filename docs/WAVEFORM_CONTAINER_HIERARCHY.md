# Waveform container hierarchy (high → low, desktop)

Exact DOM hierarchy from app root down to the waveform canvas, with **globals.css** line numbers for each level. Use these lines to modify styles.

---

## Hierarchy (desktop layout)

```
1. (ErrorBoundary – no class, not styled in globals.css)

2. .app-container
   └── 3. .menu-bar-container          [sibling of main-content]
   └── 4. .main-content
         └── 5. .waveform-section .adinkra-pattern .panel-pattern
               └── 6. (ErrorBoundary – no class)
                     └── 7. .waveform-container
                           └── 8. (inner div – no class, inline styles only in Waveform.tsx)
                                 └── 9. canvas.waveform-canvas   ← LOWEST (the waveform surface)
```

**Sibling under .waveform-section:** `ErrorBoundary` → `.marker-timeline` (MarkerTimeline component).

---

## globals.css – where to edit each level

| Level | Selector | File | Lines | Notes |
|-------|----------|------|-------|--------|
| **2** | `.app-container` | globals.css | **252–264** | Root layout; flex column, 100vh, padding, status bar space. |
| **3** | `.menu-bar-container` | globals.css | **266–286** | Menu bar; height, backdrop, border. |
| **4** | `.main-content` | globals.css | **306–316** | Main area; flex, padding, gap. Overrides in media: 321–324, 1280–1283, 1322–1328, 1375–1381, 1607–1613, 1745–1750, 2014–2017. |
| **5** | `.waveform-section` | globals.css | **328–343** | Waveform + timeline section; min/max height, flex, border-radius, shadow. Overrides: 366–370, 392–395, 1285–1289, 1330–…, 1383–…, 1615–…, 1752–…, 1967–1970, 2019–…. |
| **5** | `.adinkra-pattern` | globals.css | **1119–1122** | Base. **1124–1151** `::before` (geometric overlay). |
| **5** | `.panel-pattern` | globals.css | **1154–1156** | Base. **1158–1176** `::after` (subtle overlay). Dark theme: **1413–1415**, **1417–1419**. |
| **5** | (desktop children of `.waveform-section`) | globals.css | **981–993** | Inside `@media (min-width: 769px)`. First child = waveform block; last child = marker timeline strip. |
| **7** | `.waveform-container` | globals.css | **970–976** | Waveform wrapper; position, size, min/max height. Desktop: **996–1000**, **1009–1011** (inside `@media (min-width: 769px)`). |
| **9** | `.waveform-container canvas` | globals.css | **1014–1016** | Desktop only: canvas min-height. |
| **9** | `.waveform-canvas` | globals.css | **1019–1031** | Canvas element: display, size, image-rendering, font-smoothing. |
| **9** | `.waveform-container:hover .waveform-canvas` | globals.css | **1034–1037** | Hover opacity on canvas. |

**Shared (waveform-section + panels):**  
**1206–1215** – `.panel, .waveform-section` and `:hover` (transitions, hover lift/shadow).

---

## Quick reference – waveform path only

| Order | Element | globals.css lines |
|-------|---------|-------------------|
| 1 | `.app-container` | 252–264 |
| 2 | `.main-content` | 306–316 |
| 3 | `.waveform-section` | 328–343 |
| 4 | `.waveform-section > *:first-child` (desktop) | 981–986 |
| 5 | `.waveform-container` | 970–976 (+ 996–1000, 1009–1011 for desktop) |
| 6 | `.waveform-container canvas` (desktop) | 1014–1016 |
| 7 | `.waveform-canvas` | 1019–1031 |
| 8 | `.waveform-container:hover .waveform-canvas` | 1034–1037 |

---

## Where each level is defined in code

- **App.tsx**: `app-container` (677), `main-content` (684), `waveform-section` (686).
- **Waveform.tsx**: `waveform-container` (1268), inner div (1285, no class), `waveform-canvas` on `<canvas>` (1298).

The inner div between `.waveform-container` and `canvas` has **no class**; its layout is inline in **Waveform.tsx** (1285–1293). To style it from globals.css you’d need to add a class in Waveform.tsx or use `.waveform-container > div`.

---

# Phone view – same parts (waveform + marker timeline)

On phone (mobile layout), the app uses `.main-content.mobile-content` and `.mobile-panel` sections. The **waveform** and **marker timeline strip** use these classes.

## Phone layout structure

```
.app-container.mobile-layout
└── .main-content.mobile-content
    ├── .mobile-panel.waveform-mobile-section     ← waveform strip
    │   └── .waveform-container → canvas.waveform-canvas
    ├── .mobile-panel.timeline-mobile-section      ← marker timeline strip
    │   └── (MarkerTimeline → .marker-timeline)
    ├── .mobile-panel.playback-section
    └── .mobile-panel.marker-panel-section         ← marker list (not timeline)
```

## globals.css – phone view (waveform + marker timeline)

### Base mobile panel (no media)

| Part | Selector | Lines |
|------|----------|--------|
| Waveform section | `.mobile-panel.waveform-mobile-section` | **2145–2156** |
| Waveform container | `.mobile-panel.waveform-mobile-section .waveform-container` | **2159–2167** |
| Waveform canvas | `.mobile-panel.waveform-mobile-section canvas` | **2171–2175** |
| Timeline section | `.mobile-panel.timeline-mobile-section` | **2178–2190** |
| Timeline inner | `.mobile-panel.timeline-mobile-section > div` | **2193–2198** |

### Inside `@media (max-width: 768px)` (2285–2359)

| Part | Selector | Lines |
|------|----------|--------|
| Waveform container | `.waveform-container` | **2287–2294** |
| Waveform canvas | `.waveform-container canvas` | **2296–2299** |
| Marker timeline | `.marker-timeline` | **2302–2318** (incl. svg, rect) |

### Other phone breakpoints (desktop layout at small width)

| Breakpoint | Waveform section | Waveform container | Marker timeline |
|------------|------------------|--------------------|------------------|
| ≤768px (1572) | 1618–1624 | 1626–1629 | 1647–1651 |
| ≤480px (1715) | 1755–1760 | 1762–1769 | 1788–1793 |
| ≤360px (1959) | 1969–1972 | — | 1980–1983 |
| ≤768px landscape (2004) | 2021–2025 | — | — |

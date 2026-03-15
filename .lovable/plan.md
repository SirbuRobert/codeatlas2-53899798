
## Ce voi schimba

### Strategia
Tema nouă: **dark warm-grey** cu gradient subtil **indigo → violet** pe accent principal. Fără neon/cyan agresiv, fără grid scanline, fără glow-uri exagerate. Suprafețe gri calde, texte clare, butoane cu gradient discret. Pástrăm JetBrains Mono.

### Paletă nouă
```
Background:   240 10% 8%       (gri închis ușor albăstrui)
Surface-1:    240 8% 11%
Surface-2:    240 7% 14%
Surface-3:    240 6% 18%
Foreground:   220 15% 90%      (alb cald)
Foreground-muted: 220 10% 55%
Foreground-dim:   220 8% 35%

Primary:      245 70% 65%      (indigo/violet — înlocuiește cyan neon)
Primary-glow: 245 80% 72%

Border:       240 8% 18%
Border-bright: 240 8% 24%

Accent:       270 65% 65%      (violet discret)

Gradients:
  --gradient-brand: linear-gradient(135deg, hsl(245,70%,65%), hsl(270,65%,65%))
  --gradient-bg: radial-gradient(ellipse at top, hsl(245 50% 12%), hsl(240 10% 8%))
```

### Fișiere modificate

| Fișier | Ce se schimbă |
|---|---|
| `src/index.css` | Toate variabilele CSS: culori noi, elimină glow-uri neon, actualizează `.text-gradient-cyan`, `.panel-glass`, `.terminal-cursor`, scrollbar |
| `src/components/LandingPage.tsx` | Elimină grid bg + top glow cyan, înlocuiește cu gradient radial subtil indigo; actualizează clases inline care referențiază `text-cyan`, `bg-cyan`, `border-cyan` → `text-primary`, `bg-primary`, `border-primary` |
| `src/components/Dashboard.tsx` | Actualizează clasele inline cyan → indigo în toolbar (badge-uri active, iconițe) |

### Ce NU se schimbă
- Structura componentelor, logica, funcționalitatea
- Variabilele semantice ca `--alert`, `--success`, `--warning` (rămân funcționale)
- Culorile nodurilor din graf (rămân distincte pentru lizibilitate)
- Animațiile (slide-in, fade-in etc.)

### Detalii tehnice `index.css`
Variabila `--cyan` devine `--primary` (indigo). Clasa `.text-gradient-cyan` devine un gradient indigo→violet. `.panel-glass` primește background mai cald. Eliminăm efectul scanline (`.scanlines::after`) și `--shadow-glow-cyan` cu nuanță de neon. Scrollbar hover devine indigo în loc de cyan.

### Detalii tehnice `LandingPage.tsx`
- Eliminăm div-ul cu `backgroundImage: grid lines cyan`
- Top glow devine `radial-gradient(ellipse, hsl(245 70% 65%)...` în loc de `hsl(var(--cyan))`  
- Toate `text-cyan` → `text-primary`, `bg-cyan` → `bg-primary`, `border-cyan` → `border-primary/40`
- `text-gradient-cyan` rămâne ca clasă dar se actualizează în CSS

### Detalii tehnice `Dashboard.tsx`
- Badge-urile active (blast radius, search) care folosesc `text-cyan`, `border-cyan/30`, `bg-cyan/10` → `text-primary`, `border-primary/30`, `bg-primary/10`
- Iconița MapPin logo → culoare primary

Rezultat vizual: dark mode modern, curat, cu accent indigo/violet discret — arată profesional pentru un hackathon fără să fie „hacker movie".

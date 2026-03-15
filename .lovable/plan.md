
## Plan: Voice Input în RepoChatPanel

### Abordare
Folosim **Web Speech API** (nativă în browser, fără librării externe, fără API keys) — `SpeechRecognition` / `webkitSpeechRecognition`. Aceasta e disponibilă în Chrome, Edge, Safari 15+. Nu necesară instalare de pachete.

Flux:
1. User ține apăsat butonul microfon (sau click o dată să pornească, click din nou să oprească)
2. Textul recunoscut apare live în textarea (interimar + final)
3. La stop, textul rămâne în textarea — user poate edita și trimite cu Enter / butonul Send
4. Dacă browser-ul nu suportă Speech API → butonul microfon e ascuns

### Ce se schimbă: `src/components/RepoChatPanel.tsx`

**State nou:**
```ts
const [isListening, setIsListening] = useState(false);
const recognitionRef = useRef<SpeechRecognition | null>(null);
```

**Hook `useVoiceInput`** (inline în același fișier):
- Detectează `window.SpeechRecognition || window.webkitSpeechRecognition`
- `continuous: false`, `interimResults: true`, `lang: 'ro-RO'` cu fallback `en-US`
- `onresult` → concatenează transcript-ul în `input`
- `onend` → `setIsListening(false)`
- `toggleListening()` — pornește/oprește

**UI — zona de input** (linia 307–335):
- Adăugăm un buton microfon între textarea și butonul Send
- Când `isListening`: butonul pulsează (animație `animate-pulse`) și e colorat în roșu/cyan
- Când `!isListening`: butonul are iconița `Mic` din lucide
- Dacă browser-ul nu suportă → butonul nu e redat
- Hint text actualizat: `"Enter to send · Shift+Enter for newline · 🎙 Hold mic to speak"`

**Imports adăugate:** `Mic`, `MicOff` din `lucide-react`

### Fișiere modificate
| Fișier | Schimbare |
|---|---|
| `src/components/RepoChatPanel.tsx` | Adăugare voice input via Web Speech API — buton microfon + state + logică recunoaștere |

Zero dependențe noi. Zero edge functions noi.

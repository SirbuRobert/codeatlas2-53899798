
## Context complet

Produsul este **CodeAtlas** — un analizor de codebaze GitHub care produce un graf de dependențe 3D cu noduri, riscuri, autori, etc. Are deja:
- `RepoChatPanel` — chat AI cu streamng (Gemini/GPT)
- `CommandBar` — comenzi slash care filtrează/highlightează noduri în graf
- `SearchBar` — search text pe noduri
- `AISummaryPanel` — rezumat AI cu noduri risk/entry/orphan clickabile
- `GraphCanvas`, `TreemapView`, `SolarSystemView` — vizualizări

## Propuneri pentru "Speak Up"

Regula: **scoțând microfoanul, experiența se schimbă radical** — nu doar că scrii în loc să vorbești.

---

### Opțiunea A — Voice Commands care activează overlay-uri în graf

Vorbești în loc să apeși butoane. "Show me the risky files" → activează Security Overlay. "Blast radius on auth" → blast radius pe nodul de autentificare. "Switch to solar" → schimbă view mode.

**Cum schimbă experiența:** Fără microfon, trebuie să deschizi CommandBar, să cauți, să apeși. Cu voce, spui o frază și graful se transformă instant în fața ta — live demo-friendly. E ca a vorbi cu graful.

**Implementare:**
- `useVoiceCommand` hook — extinde `useVoiceInput` existent din `RepoChatPanel`
- Un `VoiceCommandProcessor` edge function care clasifică fraza → comandă structurată (JSON): `{ action: 'blast-radius', target: 'auth' }` etc.
- Posibile comenzi: `blast-radius <node>`, `security-review`, `ghost-city`, `switch-view <topology|treemap|solar>`, `search <query>`, `show-summary`
- Buton mic persistent în toolbar-ul Dashboard (nu doar în chat panel)
- Feedback vizual: o bandă animată în timp ce ascultă, apoi nodul/overlay-ul se aprinde

---

### Opțiunea B — Voice Search care navighează graful prin vorbire

"Find authentication files" → SearchBar se activează cu transcriptul, nodurile se highlightează. "Show me files written by Alex" → filtrare după autor. "What does this file do?" → deschide NodeInspector pe nodul selectat curent și citește cu voce un rezumat.

**Cum schimbă experiența:** Fără microfon: tastezi în SearchBar. Cu voce: e hands-free — poți prezenta live codebaza în timp ce vorbești la o conferință sau demo. Graful răspunde la vocea ta ca un assistant vizual.

---

### Opțiunea C — Voice Annotation: înregistrezi comentarii vocale pe noduri

Selectezi un nod → apăsați mic → vorbești ("this file is legacy, refactor priority Q3, owned by backend team") → transcriptul se salvează ca notă pe nod în baza de date. NodeInspector arată notele vocale salvate ca text + timestamp.

**Cum schimbă experiența:** Fără microfon, nu poți adnota rapid — ai nevoie de o interfață de text. Cu voce, faci code review vocal direct pe arhitectura vizuală. E un feature complet nou de colaborare, nu o conversie speech-to-text.

---

## Recomandare

**Opțiunea A** este cea mai spectaculoasă pentru demo live la hackathon și e singura care "schimbă experiența" în sensul că graful reacționează la comenzi vocale — fără microfon, trebuie să folosești mâinile. Cu microfon, vorbești și arhitectura codebase-ului se transformă vizual în timp real. Este și tehnic fezabil în 1 sesiune.

Prezint opțiunile ca plan, user alege.

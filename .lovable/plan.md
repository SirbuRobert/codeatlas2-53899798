

## Status: Ce e deja in aplicație vs. ce lipsește

| # | Challenge | Status | Detalii |
|---|-----------|--------|---------|
| 1 | **Fake It Till You Stripe It** (T1+1) — Stripe test mode | ❌ Nu există | Billing page e doar UI static, zero integrare Stripe reală |
| 2 | **Touch Grass** (T1+1) — 3+ utilizatori externi cu feedback | ⚠️ Parțial | Auth + signup există, dar nu ai un mecanism de feedback documentat |
| 3 | **60 Seconds of Fame** (T1+1) — video AI explainer | ❌ Nu există | Nimic legat de video generation |
| 4 | **They Want In** (T1+1) — real signups live | ✅ Există | Auth cu email/password + email verification e implementat complet |
| 5 | **Speak Up** (T2+2) — voice input care schimbă comportamentul | ✅ Există | Voice input via Web Speech API în RepoChatPanel — transcrierea merge direct în chat care controlează AI-ul |
| 6 | **API First** (T2+2) — public API documentat | ❌ Nu există | Edge functions există dar nu sunt documentate/expuse ca public API |
| 7 | **Signal Received** (T2+2) — webhook real | ❌ Nu există | Webhook-uri apar doar în mock data |
| 8 | **Lost in No Translation** (T2+2) — auto-detect language, AI adapts | ⚠️ Parțial | Voice detection detectează ro/en, dar AI chat-ul nu adaptează limba automat |
| 9 | **Second Opinion** (T2+2) — două modele AI, user compară | ❌ Nu există | Folosești un singur model (Gemini Flash) |
| 10 | **Stripe It** (T3+3) — Stripe live mode | ❌ Nu există | Depinde de #1 |

---

## Plan de implementare pentru cele care lipsesc

### 1. Fake It Till You Stripe It (T1+1)
Folosim integrarea Stripe nativă din Lovable:
- Activăm Stripe connector, creăm un produs "Pro Plan" ($29/mo)
- Edge function `create-checkout` care creează o Stripe Checkout Session în test mode
- Modificăm `Billing.tsx` să apeleze checkout-ul real în loc de toast-ul actual
- Webhook edge function `stripe-webhook` pentru `checkout.session.completed`
- Demo: user dă click pe "Upgrade to Pro" → Stripe Checkout se deschide → completează cu card de test `4242...` → redirect back cu confirmare

### 2. Touch Grass (T1+1)
- Tabel `user_feedback` (user_id, feedback_text, rating, created_at)
- Pagină `/feedback` simplă unde utilizatorii externi pot lăsa feedback după ce folosesc app-ul
- Dashboard admin simplu care afișează feedback-urile colectate
- Demo: arăți 3+ feedback-uri de la utilizatori reali

### 3. 60 Seconds of Fame (T1+1)
- Nu e ceva ce se implementează în cod — e vorba de a genera un video explainer cu un tool AI extern (Runway, Synthesia, etc.)
- Alternativ: edge function care generează un script narativ din graph summary folosind Gemini, pe care îl folosești cu un tool de video gen

### 4. API First (T2+2)
- Edge function `public-analyze` — primește un repo URL, returnează graph JSON
- Pagină `/api-docs` cu documentație interactivă (endpoint, params, response schema, curl example)
- Rate limiting pe funcție
- Demo: apelezi curl live și arăți răspunsul

### 5. Signal Received (T2+2)
- Edge function `webhook-notify` — trimite un POST la un URL configurat de user când analiza e gata
- UI în Dashboard: "Webhook URL" input în settings
- Tabel `webhook_configs` (user_id, url, events[])
- Demo: configurezi un webhook URL (ex: webhook.site), analizezi un repo, arăți notificarea care ajunge

### 6. Lost in No Translation (T2+2)
- Detectăm limba din primul mesaj al userului în chat (trimitem textul la AI cu instrucțiunea "detect language and respond in that language")
- Actualizăm system prompt-ul din `chat-repo` edge function: "Always respond in the same language the user writes in. Auto-detect — do not ask."
- Voice input deja detectează ro/en — legăm asta de chat context
- Demo: scrii în română → AI răspunde în română, schimbi în engleză → AI se adaptează instant

### 7. Second Opinion (T2+2)
- Buton "Second Opinion" în RepoChatPanel
- La activare, trimitem aceeași întrebare la 2 modele diferite (Gemini Flash + GPT-5-mini)
- UI split-view: răspunsul de la fiecare model side-by-side
- User poate vota care răspuns e mai bun
- Edge function nouă `chat-repo-dual` care face 2 calls paralele

### 8. Stripe It (T3+3)
- Aceeași implementare ca #1 dar cu Stripe live mode keys
- Se stacks cu Fake It: test mode + live mode = +4 puncte total

---

### Ordinea recomandată de implementare (effort minim → impact maxim)

1. **Lost in No Translation** — o singură linie în system prompt, deja funcțional parțial
2. **Fake It Till You Stripe It** — Lovable are Stripe integration nativă
3. **API First** — edge function simplă + pagină de docs
4. **Second Opinion** — UI split + 2 API calls paralele
5. **Signal Received** — webhook config + edge function
6. **Touch Grass** — tabel + pagină de feedback
7. **Stripe It** — switch la live keys după ce #2 merge
8. **60 Seconds of Fame** — external tool, nu necesită cod în app


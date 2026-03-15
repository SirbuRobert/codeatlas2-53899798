

## Obiectiv

Restricționează **AI Chat** (`RepoChatPanel`) și **Business Insights** (`BusinessInsightsPanel`) la utilizatorii Pro. Free users văd butoanele dar nu pot accesa — un overlay Pro gate apare când încearcă.

---

## Cum funcționează acum

- `Dashboard.tsx` randează direct `RepoChatPanel` și `BusinessInsightsPanel` fără nicio verificare de plan
- Starea subscripției (`subscribed`) există doar local în `src/pages/Billing.tsx`, nu e disponibilă în restul aplicației
- Butoanele "Ask AI" și "Business" din toolbar deschid pur și simplu panelurile, fără gate

---

## Plan de implementare

### 1. `src/hooks/useSubscription.ts` — hook nou
Hook dedicat care apelează `check-subscription` și expune `{ isPro, loading }`. Se cachează în `sessionStorage` ca să nu facă request la fiecare render.

```ts
const { isPro, loading } = useSubscription();
```

### 2. `src/components/ProGate.tsx` — component nou
Un modal/overlay compact care apare când un free user încearcă să acceseze o funcție Pro. Conține:
- Iconița funcției, titlu ("AI Chat is a Pro feature")
- Listă scurtă: "AI Chat + Business Insights = Pro"
- Buton "Upgrade to Pro →" care duce la `/billing`
- Buton "Cancel"

### 3. `src/components/Dashboard.tsx` — gate pe butoane și paneluri

**Toolbar buttons** (Ask AI + Business):
- Importă `useSubscription`
- Dacă `!isPro`, onClick deschide `ProGate` în loc de panel
- Butonul arată un mic badge `PRO` lângă icon

**Panelurile înseși** (RepoChatPanel, BusinessInsightsPanel):
- Nu se mai randează deloc dacă `!isPro` (sau rămân montate cu `isOpen=false`)

### 4. `src/pages/Billing.tsx` — actualizare copy planuri
- Free: scoate "Business Insights panel" din features, adaugă în `missing`: "AI Chat" și "Business Insights"
- Pro: adaugă "✦ AI Chat (Gemini + GPT-5)" și "✦ Business Insights" ca Pro Exclusive features

---

## Fișiere modificate/create

| Fișier | Acțiune |
|---|---|
| `src/hooks/useSubscription.ts` | Creat nou |
| `src/components/ProGate.tsx` | Creat nou |
| `src/components/Dashboard.tsx` | Modificat — gate pe 2 butoane + import hook |
| `src/pages/Billing.tsx` | Modificat — copy planuri actualizat |

---

## UX

```text
Free user apasă "Ask AI"
        ↓
ProGate modal apare imediat
  "AI Chat is a Pro feature  [Zap icon]"
  ──────────────────────────────────────
  ✦ AI Chat (ask anything about the repo)
  ✦ Business Insights (risk, tech stack)
  ──────────────────────────────────────
  [Upgrade to Pro →]   [Maybe later]
        ↓
Click "Upgrade" → navigate('/billing')
```

Pro user apasă "Ask AI" → panel se deschide direct, nicio întrerupere.


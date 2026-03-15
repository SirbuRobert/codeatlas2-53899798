
## Ce se schimbă

Lista de funcții din planurile Free și Pro conține feature-uri care **nu există** în aplicație (Multi-Repo Analysis, Team dashboards, SSO/SAML, RBAC, Audit logs, Dedicated success manager). Userul vrea să rămână **doar ce există cu adevărat**.

### Ce există real în aplicație
**Free:**
- Unlimited repo analyses
- Public & private repos (GitHub PAT)
- All views: Topology, Solar, Treemap
- AI semantic summaries (Gemini)
- Blast Radius analysis
- Security Topology overlay
- Command bar & custom slash commands

**Pro (exclusiv, chiar funcțional):**
- AI Chat — `RepoChatPanel` există și e gate-uit
- Business Insights panel — `BusinessInsightsPanel` există și e gate-uit

### Modificări în `src/pages/Billing.tsx`

**Free `features`** — păstrează doar ce există:
```
Unlimited repo analyses
Public & private repos (GitHub PAT)
All views (Topology, Solar, Treemap)
AI semantic summaries (Gemini)
Blast Radius analysis
Security Topology overlay
Command bar & custom slash commands
```

**Free `missing`** — doar cele 2 Pro features reale:
```
AI Chat (ask the repo anything)
Business Insights panel
```

**Pro `features`** — "Everything in Free" + cele 2 exclusive reale:
```
Everything in Free
✦ AI Chat (ask the repo anything)
✦ Business Insights panel
```

**Pro `missing`** — gol (nu mai lipsește nimic real)

**Hero subtitle** — schimbă textul care menționează "Multi-Repo Analysis" cu ceva real: "AI Chat and Business Insights"

**Footer note** — scoate "14-day free trial" dacă nu există această funcționalitate implementată

### Fișier modificat
| Fișier | Schimbare |
|---|---|
| `src/pages/Billing.tsx` | Actualizare `PLANS` constant + hero subtitle |

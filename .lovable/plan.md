
## Root cause — două bugs legate

### Bug 1: LOC incorect (numărul de linii afișat este mai mic)

În `fetchFileContent`, fișierul este decodat din base64 cu:
```ts
const decoded = atob(data.content.replace(/\n/g, ""));
```

Problema: `data.content` de la GitHub API conține caracterul `\n` la fiecare 60 de caractere ca **separator de line wrapping al base64** (nu ca newline real al fișierului). Codul îl șterge corect cu `.replace(/\n/g, "")` înainte de `atob` — aceasta e corectă.

Dar apoi conținutul este **trunchiat la 2800 caractere** (linia 67) și ulterior la **2500 caractere** (linia 324). Aceasta înseamnă că AI-ul vede maxim ~2500 de caractere din fiecare fișier. Dacă un fișier are 400 de linii, AI-ul poate vedea doar primele ~60-80 de linii (estimând ~35 caractere/linie medie). AI-ul nu știe că fișierul e trunchiat, și presupune că ce vede e tot fișierul → raportează LOC = numărul de linii visible, nu cel real.

**LOC real** poate fi calculat din `f.size` din GitHub tree: `size / 30` (bytes per char medie) dă o estimare rezonabilă a numărului de linii totale.

### Bug 2: Line numbers greșite pentru funcții (navigare pe linia greșită)

AI-ul primește conținut trunchiat la ~2500 caractere. Dacă funcția `handleAuth` e la linia 250 în fișierul real, dar AI-ul vede doar primele 80 de linii → fie nu o găsește, fie o inventează.

Mai mult, în prompt-ul AI există instrucțiunea:
```
- For each node, list the top 8 exported functions/classes/methods with their approximate line numbers from the file content
```

"Approximate line numbers from the **file content**" = AI numără liniile din conținutul trunchiat pe care îl vede. Conținutul trimis **nu are numerele de linie incluse** — AI estimează. Dacă vede funcția la linia 45 din fragmentul trunchiat, dar în realitate e la linia 180 (pentru că primele 100 de linii au mai puțin de 2500 caractere dar includ comentarii lungi), atunci link-ul va fi greșit.

### Fix plan

**Schimbare 1 — `fetchFileContent`: trimite conținut cu numere de linie**

Adaugă numerele de linie explicit la fiecare linie din conținut înainte de a-l trimite AI-ului. Astfel AI-ul va vedea:
```
1: import React from 'react';
2: 
3: export function handleAuth() {
```
și va ști cu certitudine că `handleAuth` e la linia 3. Aceasta **elimină complet orice ambiguitate** de numărare. Cresc limita la 4000 caractere (era 2800 → 4000) pentru a captura mai mult din fișier.

```ts
// în fetchFileContent, după decoded:
const lines = decoded.split('\n');
const numbered = lines
  .map((line, i) => `${i + 1}: ${line}`)
  .join('\n');
return numbered.slice(0, 4000);
```

**Schimbare 2 — Prompt AI: instrucțiune explicită că liniile sunt numerotate**

Actualizează regula din SYSTEM_PROMPT:
```
- For each node, list the top 8 exported functions/classes/methods. 
  The file contents include line numbers at the start of each line (e.g. "42: export function foo()"). 
  Use these EXACT line numbers — do not estimate or count manually.
```

**Schimbare 3 — LOC estimat din `size` din GitHub tree**

În `fileSample`, deja există `Math.ceil(f.size / 40)` ca estimare LOC. Dar AI-ul poate ignora asta. Adaugă în instrucțiunea AI:
```
- The file tree includes (~N LOC) estimates based on file size. Use these for the "loc" field.
```

Și crește instrucțiunea de LOC:
```
- Use file size hints from the file tree (marked as ~N LOC) for the loc field. 
  These count ALL lines including blank lines and comments — report the full file line count.
```

### Fișier modificat

Un singur fișier: `supabase/functions/analyze-repo/index.ts`

| Linie | Schimbare |
|---|---|
| 66-67 | Adaugă numere de linie la conținut; crește limita la 4000 chars |
| 324 | Crește slice la 3800 pentru a beneficia de limita mai mare |
| 86, 92 | Actualizează instrucțiunile AI pentru line numbers și LOC |

Aceasta este o soluție exactă care rezolvă root-cause: AI-ul va citi numere de linie reale din conținut în loc să le estimeze.

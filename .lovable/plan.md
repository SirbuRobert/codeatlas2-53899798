
## Problema

`case 'search'` în `handleVoiceCommand` face:
1. `setSearchOpen(true)` — deschide bara de search (vizual)
2. Trimite `CustomEvent('voice-search', { detail: result.target })` după 100ms

Dar `SearchBar` nu are niciun `window.addEventListener('voice-search', ...)` — deci event-ul e ignorat, bara se deschide goală și graful nu se schimbă deloc.

## Fix

### `src/components/Dashboard.tsx`

Înlocuiește `case 'search'` să aplice direct highlight-ul pe noduri fără a deschide search bar-ul:

```ts
case 'search':
  if (result.target) {
    const words = result.target.toLowerCase().trim().split(/\s+/);
    const matched = new Set<string>();
    for (const node of graph.nodes) {
      if (scoreNode(node, words) > 0) matched.add(node.id);
    }
    handleSearchResults(matched, result.target);
    // Opțional: deschide bara ca feedback vizual
    setSearchOpen(true);
  }
  break;
```

Dar `scoreNode` e definit în `SearchBar.tsx` — nu e exportat. Opțiuni:
- **Opțiunea 1** (cea mai simplă): exportă `scoreNode` din `SearchBar.tsx` și importă-l în `Dashboard.tsx`
- **Opțiunea 2**: duplică logica simplă de scoring în `handleVoiceCommand` (match label + path)

Aleg **Opțiunea 1** — export `scoreNode` din `SearchBar.tsx`.

### `src/components/SearchBar.tsx`
- Adaugă `export` la funcția `scoreNode`

### `src/components/Dashboard.tsx`
- Importă `scoreNode` din `SearchBar`
- Înlocuiește `case 'search'` să calculeze matched ids direct și să cheme `handleSearchResults(matched, result.target)`  
- Șterge `CustomEvent('voice-search', ...)` complet — nu mai e necesar
- Menține `setSearchOpen(true)` opțional ca feedback vizual că search-ul e activ

## Fișiere modificate
| Fișier | Schimbare |
|---|---|
| `src/components/SearchBar.tsx` | Export `scoreNode` |
| `src/components/Dashboard.tsx` | `case 'search'` aplică direct highlight pe noduri via `scoreNode` + `handleSearchResults` |

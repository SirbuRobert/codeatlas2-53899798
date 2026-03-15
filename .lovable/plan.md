
## Root cause diagnosis

**Two bugs working together:**

**Bug 1 — Silent RPC error swallowing in `analyze-repo`**
In `supabase/functions/analyze-repo/index.ts` (lines 400–406):
```typescript
const { data: decrypted } = await serviceClient.rpc("decrypt_github_token", { ... });
if (decrypted) resolvedToken = decrypted as string;
```
Only `data` is destructured — `error` is ignored. When the RPC call fails (returns `{ data: null, error: {...} }`), the catch block is NOT triggered. `resolvedToken` stays `undefined`, no GitHub token is sent, private repos return 404.

**Bug 2 — DB function schema fragility**
Two migrations ran sequentially:
- Migration `20260315124407`: functions use `SET search_path = public, pg_catalog` — no `extensions` schema  
- Migration `20260315124450`: functions overridden to use `extensions.pgp_sym_encrypt/decrypt` WITH explicit schema prefix

`pgcrypto` in Supabase is installed in the `extensions` schema. The explicit `extensions.pgp_sym_decrypt(...)` call is correct IF pgcrypto is there, but fails silently if it's not. The `decode()` built-in is in `pg_catalog` and is fine.

---

## Fix

### 1. New DB migration — rewrite the two functions
Replace the explicit `extensions.` prefix with an inclusive search_path that checks `extensions` before `public`, and call `pgp_sym_encrypt/decrypt` WITHOUT schema prefix. This makes the function work regardless of which schema pgcrypto lives in.

```sql
CREATE OR REPLACE FUNCTION public.encrypt_github_token(p_token text, p_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(p_token, p_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_github_token(p_user_id uuid, p_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $$
DECLARE v_result text;
BEGIN
  SELECT pgp_sym_decrypt(decode(github_token, 'base64'), p_key)
  INTO v_result
  FROM public.profiles
  WHERE id = p_user_id AND github_token IS NOT NULL;
  RETURN v_result;
END;
$$;
```

### 2. Fix `analyze-repo` — check both `data` and `error` from RPC
```typescript
const { data: decrypted, error: rpcError } = await serviceClient.rpc("decrypt_github_token", {
  p_user_id: userId,
  p_key: ENCRYPTION_KEY,
});
if (rpcError) {
  console.error("[analyze-repo] Token decryption RPC failed:", rpcError.message);
} else if (decrypted) {
  resolvedToken = decrypted as string;
  console.log("[analyze-repo] GitHub token resolved for user");
}
```

---

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Rewrite both DB functions with search_path `extensions, public, pg_catalog` and no schema prefix |
| `supabase/functions/analyze-repo/index.ts` | Destructure `error` from RPC, add console.log for debug visibility |

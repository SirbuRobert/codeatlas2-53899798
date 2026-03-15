-- Helper: encrypt a plain-text token — runs with pgcrypto in search_path
CREATE OR REPLACE FUNCTION public.encrypt_github_token(p_token text, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(p_token::text, p_key::text), 'base64');
END;
$$;

-- Helper: decrypt the stored token for a given user
CREATE OR REPLACE FUNCTION public.decrypt_github_token(p_user_id uuid, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result text;
BEGIN
  SELECT pgp_sym_decrypt(decode(github_token, 'base64'), p_key::text)
  INTO v_result
  FROM public.profiles
  WHERE id = p_user_id
    AND github_token IS NOT NULL;
  RETURN v_result;
END;
$$;
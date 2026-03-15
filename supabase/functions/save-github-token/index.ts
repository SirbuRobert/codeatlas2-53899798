import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ENCRYPTION_KEY = Deno.env.get("GITHUB_TOKEN_ENCRYPTION_KEY");

    if (!ENCRYPTION_KEY) {
      throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY secret not configured");
    }

    // Verify the user JWT using the anon client
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { token } = body as { token?: string };

    // Use service role to run pgcrypto SQL
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!token || token.trim() === "") {
      // Clear the token
      const { error } = await serviceClient
        .from("profiles")
        .update({ github_token: null })
        .eq("id", userId);

      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encrypt via pgp_sym_encrypt — result is a bytea stored as base64 text
    const { data: encryptedRows, error: encryptError } = await serviceClient.rpc(
      "encrypt_github_token",
      { p_token: token.trim(), p_key: ENCRYPTION_KEY },
    );

    if (encryptError) throw new Error(`Encryption failed: ${encryptError.message}`);

    const encryptedValue = encryptedRows as string;

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ github_token: encryptedValue })
      .eq("id", userId);

    if (updateError) throw new Error(updateError.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-github-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { repo_url, event, payload } = await req.json();
    if (!repo_url || !event) {
      return new Response(JSON.stringify({ error: "Missing repo_url or event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up webhook configs for this user + repo
    const { data: configs } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("user_id", userId)
      .eq("repo_url", repo_url);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No webhook configured for this repo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ url: string; status: string }> = [];

    for (const config of configs) {
      if (!config.events.includes(event) && !config.events.includes("*")) continue;

      try {
        const webhookPayload = {
          event,
          repo_url,
          timestamp: new Date().toISOString(),
          data: payload ?? {},
        };

        const resp = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CodeAtlas-Event": event,
            "X-CodeAtlas-Repo": repo_url,
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000),
        });

        results.push({ url: config.url, status: resp.ok ? `${resp.status} OK` : `${resp.status} Failed` });
      } catch (err) {
        results.push({ url: config.url, status: `Error: ${err instanceof Error ? err.message : "Unknown"}` });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook-notify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

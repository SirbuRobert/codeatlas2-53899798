import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { repo_url, github_token } = body;

    if (!repo_url) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: repo_url",
          example: { repo_url: "https://github.com/owner/repo", github_token: "optional_pat" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to analyze-repo function
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const analyzeResp = await fetch(`${SUPABASE_URL}/functions/v1/analyze-repo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ repoUrl: repo_url, githubToken: github_token ?? null }),
    });

    if (!analyzeResp.ok) {
      const errText = await analyzeResp.text().catch(() => "Unknown error");
      return new Response(
        JSON.stringify({ error: `Analysis failed: ${errText.slice(0, 300)}` }),
        { status: analyzeResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const graph = await analyzeResp.json();

    // Return graph with metadata
    return new Response(
      JSON.stringify({
        success: true,
        api_version: "1.0",
        repo_url,
        analyzed_at: new Date().toISOString(),
        graph,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("public-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

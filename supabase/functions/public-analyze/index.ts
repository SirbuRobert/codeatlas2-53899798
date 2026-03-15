import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── In-memory rate limiter: max 3 analyses / 15 min per IP ───────────────────
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_IP = 3;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSecs: 0 };
  }

  if (entry.count >= MAX_PER_IP) {
    const retryAfterSecs = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  entry.count++;
  return { allowed: true, retryAfterSecs: 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Rate limit by IP ────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";

  const { allowed, retryAfterSecs } = checkRateLimit(ip);
  if (!allowed) {
    const mins = Math.ceil(retryAfterSecs / 60);
    return new Response(
      JSON.stringify({
        error: `Too many requests. Please wait ~${mins} minute${mins !== 1 ? "s" : ""} before trying again.`,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSecs),
        },
      },
    );
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, graphContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextStr = graphContext ? JSON.stringify(graphContext) : "";
    const systemPrompt = `You are CodeAtlas AI — an expert code analyst with deep knowledge of the following codebase.

CODEBASE GRAPH CONTEXT:
${contextStr}

Your role:
- Answer questions about architecture, files, functions, risk, dependencies, and contributors based on the graph context above.
- When you mention a file or node, use its EXACT label name as it appears in the context.
- Be concise and specific. Reference actual file names, function names, risk levels, and author names.
- CRITICAL: Always detect the language the user is writing in and respond in that SAME language. Auto-detect and adapt instantly.
- Format your response with markdown for clarity.`;

    const makeRequest = async (model: string) => {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
        if (response.status === 402) throw new Error("Usage limit reached. Please add credits to continue.");
        throw new Error(`AI gateway error ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? "";
    };

    // Run both models in parallel
    const [geminiResult, gptResult] = await Promise.allSettled([
      makeRequest("google/gemini-3-flash-preview"),
      makeRequest("openai/gpt-5-mini"),
    ]);

    const gemini = geminiResult.status === "fulfilled" ? geminiResult.value : `⚠️ Gemini error: ${(geminiResult as PromiseRejectedResult).reason?.message}`;
    const gpt = gptResult.status === "fulfilled" ? gptResult.value : `⚠️ GPT error: ${(gptResult as PromiseRejectedResult).reason?.message}`;

    return new Response(
      JSON.stringify({ gemini, gpt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-repo-dual error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

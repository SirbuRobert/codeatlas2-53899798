import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, nodes } = await req.json() as {
      description: string;
      nodes: Array<{ id: string; label: string; type: string; path: string; semanticSummary?: string; flags: string[] }>;
    };

    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: "description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build a compact node catalog for the AI
    const catalog = nodes.map(n =>
      `id="${n.id}" type=${n.type} label="${n.label}" path="${n.path}"${n.semanticSummary ? ` summary="${n.semanticSummary}"` : ""}${n.flags.length ? ` flags=[${n.flags.join(",")}]` : ""}`
    ).join("\n");

    const systemPrompt = `You are a codebase intelligence assistant. You receive a description of what the user wants to highlight on their architectural graph, and a catalog of all nodes in the graph. Your job is to return ONLY the node IDs (from the catalog) that best match the description. Be precise — only include nodes that are directly relevant. Return a JSON object with a single key "nodeIds" containing an array of matching node ID strings.`;

    const userMessage = `User command description: "${description}"

Node catalog:
${catalog}

Return a JSON object: { "nodeIds": ["id1", "id2", ...] }
Only include node IDs from the catalog above. Return an empty array if nothing matches.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI API error ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const rawContent = aiJson.choices?.[0]?.message?.content ?? "{}";

    let parsed: { nodeIds?: string[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { nodeIds: [] };
    }

    const nodeIds: string[] = Array.isArray(parsed.nodeIds) ? parsed.nodeIds : [];

    return new Response(JSON.stringify({ nodeIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

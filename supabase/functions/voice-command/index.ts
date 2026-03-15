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
    const { transcript, nodes } = await req.json() as {
      transcript: string;
      nodes: Array<{ id: string; label: string; type: string; path: string }>;
    };

    if (!transcript?.trim()) {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const nodeCatalog = nodes.slice(0, 200).map(n =>
      `id="${n.id}" label="${n.label}" type=${n.type} path="${n.path}"`
    ).join("\n");

    const systemPrompt = `You are a voice command interpreter for a codebase architecture visualization tool called CodeAtlas.

The user spoke a command. Parse it into one of these structured actions:

ACTIONS:
- blast-radius: show impact/dependency radius of a node. Requires a target node.
- security-review: activate security overlay showing risky paths and auth chains.
- ghost-city: toggle ghost mode (fade non-orphan nodes, highlight orphan/unused files).
- switch-view: switch the visualization view. target must be one of: topology, treemap, solar.
- search: highlight nodes matching a query. target is the search query.
- show-summary: open the AI summary panel.
- clear: clear all active overlays.
- open-chat: open the AI chat panel.

EXAMPLES:
"show blast radius on auth" → { "action": "blast-radius", "target": "auth", "confidence": 0.9 }
"blast radius on the authentication module" → { "action": "blast-radius", "target": "auth", "confidence": 0.85 }
"show me risky files" → { "action": "security-review", "target": null, "confidence": 0.95 }
"security overlay" → { "action": "security-review", "target": null, "confidence": 0.99 }
"switch to solar" → { "action": "switch-view", "target": "solar", "confidence": 0.99 }
"go to treemap" → { "action": "switch-view", "target": "treemap", "confidence": 0.95 }
"show topology" → { "action": "switch-view", "target": "topology", "confidence": 0.99 }
"ghost city" → { "action": "ghost-city", "target": null, "confidence": 0.99 }
"find unused files" → { "action": "ghost-city", "target": null, "confidence": 0.85 }
"search for database files" → { "action": "search", "target": "database", "confidence": 0.9 }
"find authentication logic" → { "action": "search", "target": "authentication", "confidence": 0.88 }
"show summary" → { "action": "show-summary", "target": null, "confidence": 0.95 }
"clear everything" → { "action": "clear", "target": null, "confidence": 0.99 }
"open chat" → { "action": "open-chat", "target": null, "confidence": 0.95 }

For blast-radius: if a target is given, find the BEST matching node id from the catalog below and return it as nodeId.

Return a JSON object: { "action": string, "target": string | null, "nodeId": string | null, "confidence": number, "humanReadable": string }
- action: the action name
- target: the raw target string from the transcript (for search) or the view name (for switch-view), or null
- nodeId: the matched node id from the catalog (only for blast-radius), or null
- confidence: 0-1 how confident you are this is the right interpretation
- humanReadable: a short friendly confirmation message like "Showing blast radius for auth.ts" or "Switching to Solar view"

Node catalog (for blast-radius target matching):
${nodeCatalog}`;

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
          { role: "user", content: `Voice transcript: "${transcript}"` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI API error ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const rawContent = aiJson.choices?.[0]?.message?.content ?? "{}";

    let parsed: { action?: string; target?: string | null; nodeId?: string | null; confidence?: number; humanReadable?: string };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {};
    }

    return new Response(JSON.stringify({
      action: parsed.action ?? "unknown",
      target: parsed.target ?? null,
      nodeId: parsed.nodeId ?? null,
      confidence: parsed.confidence ?? 0,
      humanReadable: parsed.humanReadable ?? transcript,
    }), {
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

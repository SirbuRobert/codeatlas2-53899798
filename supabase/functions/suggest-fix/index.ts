import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { node, repoUrl, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build rich context from node metadata
    const flags: string[] = node?.metadata?.flags ?? [];
    const complexity: number = node?.metadata?.complexity ?? 0;
    const coverage: number = node?.metadata?.coverage ?? 0;
    const churn: number = node?.metadata?.churn ?? 0;
    const dependents: number = node?.metadata?.dependents ?? 0;
    const riskLevel: string = node?.metadata?.riskLevel ?? "none";
    const semanticSummary: string = node?.metadata?.semanticSummary ?? "";
    const loc: number = node?.metadata?.loc ?? 0;
    const path: string = node?.metadata?.path ?? "";
    const nodeType: string = node?.type ?? "file";

    // Detect response language
    const userLang = (lang as string) ?? "en";
    const isRomanian = userLang.startsWith("ro");
    const responseLanguage = isRomanian
      ? "Romanian (limba română)"
      : "English";

    const FLAG_DESCRIPTIONS: Record<string, string> = {
      "single-point-of-failure": "Single Point of Failure — no redundancy, whole system depends on this node",
      "low-coverage": "Low Test Coverage — insufficient automated tests",
      "high-complexity": "High Cyclomatic Complexity — many code paths, hard to maintain",
      "high-churn": "High Git Churn — frequent changes, instability risk",
      "security-critical": "Security Critical — handles auth/secrets/permissions",
      "circular-dep": "Circular Dependency — creates tight coupling and potential runtime errors",
      "orphan": "Dead Code / Orphan — not imported anywhere, bloats bundle",
      "no-tests": "No Tests — completely untested",
      "no-integration-tests": "No Integration Tests — behavior under real conditions is unknown",
    };

    const flagDescriptions = flags.map((f) => FLAG_DESCRIPTIONS[f] ?? f).join("\n- ");

    const userPrompt = `
Analyze the following codebase node and identify the most impactful problems and propose concrete fixes.

Node: ${node?.label ?? "unknown"}
Type: ${nodeType}
Path: ${path}
Risk Level: ${riskLevel.toUpperCase()}
Lines of Code: ${loc}
Cyclomatic Complexity: ${complexity}/20
Test Coverage: ${coverage}%
Git Churn: ${churn}/100
Upstream Dependents: ${dependents}

Risk Flags:
- ${flagDescriptions || "none"}

AI Semantic Summary:
${semanticSummary || "No summary available."}

Repo: ${repoUrl ?? "unknown"}

Instructions:
- Respond in ${responseLanguage}.
- Be specific and technical but readable by a developer.
- The "problem" field should describe WHY this is risky (connect the data points).
- The "suggestion" field should contain 2-4 bullet points with concrete, actionable steps (use • as bullet).
- Keep both fields concise: problem ≤ 3 sentences, suggestion ≤ 4 bullets.
`.trim();

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a senior software architect specializing in code quality, security, and maintainability. You analyze codebases and provide precise, actionable improvement suggestions.",
        },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_code_issue",
            description:
              "Report a detected code quality or risk issue with a concrete fix suggestion.",
            parameters: {
              type: "object",
              properties: {
                problem: {
                  type: "string",
                  description:
                    "Clear natural-language explanation of the problem and why it is risky (2-3 sentences).",
                },
                suggestion: {
                  type: "string",
                  description:
                    "Concrete improvement proposal with 2-4 bullet points (use • as bullet character).",
                },
                priority: {
                  type: "string",
                  enum: ["critical", "high", "medium", "low"],
                  description: "Severity of the issue based on risk level and impact.",
                },
              },
              required: ["problem", "suggestion", "priority"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_code_issue" } },
    };

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI did not return structured data." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { problem: string; suggestion: string; priority: string };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        problem: parsed.problem,
        suggestion: parsed.suggestion,
        priority: parsed.priority,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("suggest-fix error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

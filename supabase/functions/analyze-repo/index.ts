import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Ignore patterns for file tree filtering ──────────────────────────────────
const IGNORED_SEGMENTS = [
  "node_modules", ".git", "dist", "build", ".next", ".nuxt", ".output",
  "coverage", ".nyc_output", "vendor", "__pycache__", ".pytest_cache",
  "target", ".cargo", ".gradle", ".idea", ".vscode", "bin", "obj",
  ".DS_Store", "Thumbs.db", "*.min.js", "*.min.css", "*.lock",
  "package-lock.json", "yarn.lock", "bun.lockb", "pnpm-lock",
];

// ── Priority files whose content we want to fetch ────────────────────────────
const PRIORITY_FILE_NAMES = [
  "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml",
  "requirements.txt", "composer.json", "mix.exs", "build.gradle",
  "README.md", "readme.md", "README.mdx",
  "index.ts", "index.js", "main.ts", "main.js", "main.py", "main.go",
  "main.rs", "server.ts", "server.js", "app.ts", "app.js", "app.py",
  "index.tsx", "App.tsx", "App.jsx",
];

function isIgnored(path: string): boolean {
  return IGNORED_SEGMENTS.some((seg) => path.includes(seg));
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .replace(/^github\.com\//, ""); // handle double
  const parts = cleaned.split("/");
  if (parts.length < 2) throw new Error(`Invalid GitHub URL: "${url}". Expected format: github.com/owner/repo`);
  return { owner: parts[0], repo: parts[1] };
}

async function githubFetch(path: string, headers: Record<string, string>) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404) throw new Error("Repository not found or is private. For private repos, add a GitHub token.");
    if (res.status === 403 || res.status === 429) {
      throw new Error("GitHub API rate limit reached. Wait a minute or add a GitHub token for higher limits.");
    }
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  headers: Record<string, string>,
): Promise<string> {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, headers);
    if (data.encoding === "base64" && data.content) {
      const decoded = atob(data.content.replace(/\n/g, ""));
      // Prepend line numbers so AI uses exact line positions, not estimates
      const lines = decoded.split('\n');
      const numbered = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
      return numbered.slice(0, 4000);
    }
    return "";
  } catch {
    return "";
  }
}

// ── AI System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert software architect performing deep static analysis of a GitHub repository.

Your task: Generate a precise architectural knowledge graph.

RULES:
- Generate 12-22 nodes — focus on architectural significance, not file count
- Group small related files (e.g. all middleware) into one logical node  
- Identify real entry points: server bootstrap, main function, CLI entry, API gateway
- Assess risk realistically: critical = (>8 dependents AND/OR security-critical AND/OR <45% coverage)
- Write semantic summaries that are genuinely insightful ("Handles JWT validation for all 9 route modules — SPOF")
- Use file size hints from the file tree (marked as ~N LOC) for the "loc" field — these count ALL lines including blank lines and comments. Report the full file line count, not just code lines.
- Identify orphaned files: zero dependents, not a main entry, likely dead code
- Build the dependency graph: what calls what, what imports what
- For databases: identify ORM schemas, migration files, DB clients
- DO NOT include test files as primary nodes — mention coverage in the tested module instead
- Map only the architecturally significant edges (max 30 edges)
- For each node, list the top 8 exported functions/classes/methods. The file contents include explicit line numbers at the start of each line (e.g. "42: export function foo()"). Use these EXACT line numbers — do NOT estimate or count manually.
- CRITICAL — line number rules:
  • "line" MUST point to the line containing the actual declaration keyword: "function", "class", "const", "export function", "async function", "export const", "export default function", "export class", "=>" (arrow). NEVER point to a comment (// ...), a JSDoc block (/** */), an import statement, or a type alias.
  • Example: if line 38 is "// loginUser handles auth" and line 42 is "export async function loginUser(", then line MUST be 42, NOT 38.
   • "endLine" MUST be the line number of the closing "}" at the SAME indentation level as the opening declaration. Count brackets carefully. OMIT endLine unless ALL three conditions are met: (1) you counted every opening and closing bracket manually and are 100% certain of the closing line, (2) endLine - line <= 60 (short functions only — large bodies make bracket-counting unreliable), (3) the file has >= 100 lines total (avoids accidental file-end references). When in doubt — OMIT. A wrong range (e.g. L15-L387 that highlights the entire file) is far worse than no range at all. It is always better to link only to the declaration line.

NODE TYPE GUIDE:
- service: Application bootstrap, server entry, main process
- module: Feature area grouping (auth module, billing module, router group)
- class: Classes, services, repositories, managers
- function: Pure utilities, helpers, middleware functions
- database: ORM schemas, DB clients, migrations, models
- api: HTTP controllers, route handlers, API gateway
- file: Uncategorized significant files

RISK LEVELS:
- critical: >10 dependents OR security-critical (auth/payments/crypto) OR <40% coverage
- high: 6-10 dependents OR 40-60% coverage OR complexity >14
- medium: 3-5 dependents OR 60-80% coverage OR complexity 10-14
- low: <3 dependents, good coverage, low complexity
- none: stable dependencies, config files, well-tested utilities`;

// ── Tool Calling Schema ───────────────────────────────────────────────────────
const GRAPH_TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_codebase_graph",
      description: "Generate a structured architectural knowledge graph of the repository",
      parameters: {
        type: "object",
        properties: {
          nodes: {
            type: "array",
            description: "12-22 architectural nodes",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique kebab-case identifier" },
                type: { type: "string", enum: ["file", "class", "function", "module", "service", "database", "api"] },
                label: { type: "string", description: "Short name (filename or class name)" },
                path: { type: "string", description: "Primary file path" },
                loc: { type: "number", description: "Estimated lines of code" },
                complexity: { type: "number", description: "Cyclomatic complexity estimate 1-20" },
                churn: { type: "number", description: "Change frequency estimate 0-100. Base this on how foundational the file is and how often it changes. Entry points: 70-90. Core services/controllers: 40-80. Utilities/helpers: 5-20. Orphans/dead code: 0. Must vary realistically across nodes." },
                dependents: { type: "number", description: "How many nodes depend on this" },
                dependencies: { type: "number", description: "How many nodes this depends on" },
                coverage: { type: "number", description: "Estimated test coverage % 0-100" },
                semanticSummary: { type: "string", description: "Insightful 1-2 sentence description" },
                author: { type: "string", description: "Inferred team or author" },
                language: { type: "string" },
                riskLevel: { type: "string", enum: ["critical", "high", "medium", "low", "none"] },
                flags: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "single-point-of-failure", "low-coverage", "high-complexity",
                      "high-churn", "security-critical", "orphan", "no-tests",
                      "circular-dep", "no-integration-tests",
                    ],
                  },
                },
                isEntryPoint: { type: "boolean" },
                isOrphan: { type: "boolean" },
                functions: {
                  type: "array",
                  description: "Top 8 exported functions/classes/methods with exact line numbers",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Function or class name" },
                      line: { type: "number", description: "Line number of the actual declaration keyword (function/class/const/export). MUST NOT be a comment, JSDoc, import, or type line — must be the line with 'function', 'class', 'const', 'export', etc." },
                      endLine: { type: "number", description: "Line number of the closing brace '}' at the same indentation as the opening declaration. OMIT if: (1) you are not 100% certain, (2) endLine - line > 80 (large functions = unreliable bracket counting), or (3) the file has fewer than 100 lines total (risk of pointing to file end). Better no range than a wrong range." },
                      kind: { type: "string", enum: ["function", "class", "export", "const", "method"] },
                      isExported: { type: "boolean" },
                    },
                    required: ["name", "line", "endLine", "kind", "isExported"],
                  },
                },
              },
              required: ["id", "type", "label", "path", "semanticSummary", "riskLevel", "language", "loc", "complexity", "churn", "coverage", "dependents", "dependencies"],
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source: { type: "string" },
                target: { type: "string" },
                relation: { type: "string", enum: ["imports", "calls", "inherits", "composes", "queries", "exposes"] },
                strength: { type: "number", description: "0-1 relationship strength" },
              },
              required: ["source", "target", "relation"],
            },
          },
          summary: {
            type: "string",
            description: "3-4 sentence plain-English summary: tech stack, architecture, main risk areas, what makes this codebase interesting",
          },
          primaryLanguage: { type: "string" },
          stats: {
            type: "object",
            properties: {
              totalFiles: { type: "number" },
              totalLines: { type: "number" },
              avgComplexity: { type: "number" },
              hotspots: { type: "number" },
              orphans: { type: "number" },
              circularDeps: { type: "number" },
              testCoverage: { type: "number" },
              languages: { type: "object", additionalProperties: { type: "number" } },
            },
            required: ["totalFiles", "totalLines", "avgComplexity", "hotspots", "orphans", "circularDeps", "testCoverage", "languages"],
          },
          entryPoints: {
            type: "array",
            items: { type: "string" },
            description: "Node IDs of main entry points",
          },
        },
        required: ["nodes", "edges", "summary", "primaryLanguage", "stats", "entryPoints"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { repoUrl, token } = body as { repoUrl: string; token?: string };

    if (!repoUrl?.trim()) {
      return new Response(JSON.stringify({ error: "repoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { owner, repo } = parseGitHubUrl(repoUrl);

    // ── GitHub API headers ──────────────────────────────────────────────
    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CodeAtlas-AXON/1.0",
    };
    if (token) ghHeaders["Authorization"] = `Bearer ${token}`;

    // ── 1. Fetch repo metadata + contributors in parallel ──────────────
    const [repoInfo, contributorsRaw] = await Promise.all([
      githubFetch(`/repos/${owner}/${repo}`, ghHeaders),
      githubFetch(`/repos/${owner}/${repo}/contributors?per_page=15&anon=0`, ghHeaders).catch(() => []),
    ]);
    const defaultBranch: string = repoInfo.default_branch || "main";

    // Build contributor list: login + contributions count
    const contributors: Array<{ login: string; contributions: number }> =
      Array.isArray(contributorsRaw)
        ? contributorsRaw
            .filter((c: Record<string, unknown>) => c.type !== "Bot" && c.login)
            .map((c: Record<string, unknown>) => ({
              login: c.login as string,
              contributions: (c.contributions as number) ?? 0,
            }))
        : [];
    const topContributors = contributors.slice(0, 10);

    // ── 2. Fetch recursive file tree ────────────────────────────────────
    let treeData: { tree: Array<{ type: string; path: string; size?: number }>; truncated?: boolean };
    try {
      treeData = await githubFetch(
        `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        ghHeaders,
      );
    } catch {
      // Fallback: try alternate branch names
      try {
        treeData = await githubFetch(`/repos/${owner}/${repo}/git/trees/main?recursive=1`, ghHeaders);
      } catch {
        treeData = await githubFetch(`/repos/${owner}/${repo}/git/trees/master?recursive=1`, ghHeaders);
      }
    }

    const allFiles = (treeData.tree || [])
      .filter((f) => f.type === "blob" && !isIgnored(f.path))
      .slice(0, 400);

    const totalFilesFiltered = allFiles.length;

    // ── 3. Identify key files to fetch content for ──────────────────────
    const keyFilePaths: string[] = [];

    // Priority filenames first
    for (const name of PRIORITY_FILE_NAMES) {
      const found = allFiles.find(
        (f) => f.path === name || f.path.endsWith(`/${name}`),
      );
      if (found && keyFilePaths.length < 10) keyFilePaths.push(found.path);
    }

    // Add shallow source files (depth ≤ 3) not already included
    const shallowSrc = allFiles
      .filter((f) => {
        const depth = f.path.split("/").length;
        return (
          depth <= 3 &&
          (f.path.endsWith(".ts") || f.path.endsWith(".js") ||
            f.path.endsWith(".py") || f.path.endsWith(".go") ||
            f.path.endsWith(".rs") || f.path.endsWith(".java") ||
            f.path.endsWith(".rb") || f.path.endsWith(".php"))
        );
      })
      .slice(0, 6);

    for (const f of shallowSrc) {
      if (!keyFilePaths.includes(f.path) && keyFilePaths.length < 14) {
        keyFilePaths.push(f.path);
      }
    }

    // ── 4. Fetch file contents concurrently ─────────────────────────────
    const contentEntries = await Promise.all(
      keyFilePaths.map(async (p) => ({
        path: p,
        content: await fetchFileContent(owner, repo, p, ghHeaders),
      })),
    );

    const fileContentsText = contentEntries
      .filter((e) => e.content.length > 50)
      .map(
        (e) =>
          `--- FILE: ${e.path} ---\n${e.content.slice(0, 3800)}\n`,
      )
      .join("\n");

    // ── 5. Build compact directory summary ─────────────────────────────
    const dirCount = new Map<string, number>();
    for (const f of allFiles) {
      const parts = (f.path as string).split("/");
      const dir = parts.length > 1 ? parts[0] : "(root)";
      dirCount.set(dir, (dirCount.get(dir) || 0) + 1);
    }

    const dirSummary = Array.from(dirCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([d, c]) => `  ${d}/ → ${c} files`)
      .join("\n");

    const fileSample = allFiles
      .slice(0, 180)
      .map((f) => `  ${f.path}${f.size ? ` (~${Math.ceil((f.size as number) / 40)} LOC)` : ""}`)
      .join("\n");

    // ── 6. Call Lovable AI ───────────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured in secrets");

    const contributorLines = topContributors.length > 0
      ? topContributors.map((c, i) => `  ${i + 1}. ${c.login} (${c.contributions} commits)`).join("\n")
      : "  (no contributor data available)";

    const userMessage = `Analyze this repository and generate an architectural knowledge graph:

REPOSITORY: ${owner}/${repo}
URL: https://github.com/${owner}/${repo}
DESCRIPTION: ${repoInfo.description || "No description"}
PRIMARY LANGUAGE: ${repoInfo.language || "Unknown"}
STARS: ${repoInfo.stargazers_count ?? 0} | FORKS: ${repoInfo.forks_count ?? 0}
SIZE: ${repoInfo.size ?? 0} KB | DEFAULT BRANCH: ${defaultBranch}
TOTAL ANALYSED FILES: ${totalFilesFiltered}${treeData.truncated ? " (tree was truncated — partial analysis)" : ""}

TOP CONTRIBUTORS (use these real GitHub usernames for the "author" field on each node — assign based on the module's likely ownership area):
${contributorLines}

DIRECTORY STRUCTURE:
${dirSummary}

FILE TREE SAMPLE (${Math.min(180, totalFilesFiltered)} files):
${fileSample}

KEY FILE CONTENTS:
${fileContentsText || "(Could not fetch file contents — base analysis only from file tree)"}

Generate an insightful architectural knowledge graph. Identify real risks and architectural patterns.
IMPORTANT: Use the real contributor GitHub usernames listed above for the "author" field. Assign ownership based on the area of the codebase (e.g. the top contributor owns the core/entry-point files). Never use "unknown" as an author.`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          tools: GRAPH_TOOLS,
          tool_choice: { type: "function", function: { name: "generate_codebase_graph" } },
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage settings.");
      const errText = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a valid graph structure. Try a different repository.");
    }

    let graphData: {
      nodes: Array<Record<string, unknown>>;
      edges: Array<{ source: string; target: string; relation: string; strength?: number }>;
      summary: string;
      primaryLanguage: string;
      stats: {
        totalFiles: number;
        totalLines: number;
        avgComplexity: number;
        hotspots: number;
        orphans: number;
        circularDeps: number;
        testCoverage: number;
        languages: Record<string, number>;
      };
      entryPoints: string[];
    };

    try {
      graphData = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI graph output. Please try again.");
    }

    // ── 7. Post-process edges ────────────────────────────────────────────
    const nodeIds = new Set((graphData.nodes || []).map((n) => n.id as string));
    const processedEdges = (graphData.edges || [])
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        id: `e${i + 1}`,
        source: e.source,
        target: e.target,
        relation: e.relation || "imports",
        strength: e.strength ?? 0.7,
      }));

    // ── 8. Fix up any remaining "unknown" authors using real contributors ─
    const fallbackAuthor = topContributors[0]?.login ?? owner;
    const processedNodes = (graphData.nodes || []).map((n) => {
      const authorVal = (n.author as string | undefined) ?? "";
      if (!authorVal || authorVal.toLowerCase() === "unknown" || authorVal.trim() === "") {
        return { ...n, author: fallbackAuthor };
      }
      return n;
    });

    // ── 9. Build final response ──────────────────────────────────────────
    const response = {
      nodes: processedNodes,
      edges: processedEdges,
      summary: graphData.summary || "",
      language: graphData.primaryLanguage || repoInfo.language || "Unknown",
      primaryLanguage: graphData.primaryLanguage || repoInfo.language || "Unknown",
      repoUrl: `github.com/${owner}/${repo}`,
      repoName: repoInfo.name,
      version: defaultBranch,
      analyzedAt: new Date().toISOString(),
      entryPoints: graphData.entryPoints || [],
      stats: {
        totalFiles: graphData.stats?.totalFiles ?? totalFilesFiltered,
        totalLines: graphData.stats?.totalLines ?? 0,
        avgComplexity: graphData.stats?.avgComplexity ?? 5,
        hotspots: graphData.stats?.hotspots ?? 0,
        orphans: graphData.stats?.orphans ?? 0,
        circularDeps: graphData.stats?.circularDeps ?? 0,
        testCoverage: graphData.stats?.testCoverage ?? 0,
        languages: graphData.stats?.languages ?? { [repoInfo.language || "Unknown"]: 100 },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-repo error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

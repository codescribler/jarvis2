import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

async function authenticateKey(
  request: Request,
): Promise<{ hashedKey: string } | { error: Response }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: new Response(
        JSON.stringify({ error: "Missing Bearer token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return {
      error: new Response(
        JSON.stringify({ error: "Empty token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      ),
    };
  }
  const hashedKey = await sha256Hex(rawKey);
  return { hashedKey };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

http.route({
  path: "/api/sync",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/sync",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authResult = await authenticateKey(request);
    if ("error" in authResult) return authResult.error;

    const record = await ctx.runQuery(internal.apiKeys.getByHash, {
      hashedKey: authResult.hashedKey,
    });
    if (!record) return jsonResponse({ error: "Invalid token" }, 401);

    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");
    const sinceParsed = sinceParam !== null ? Number(sinceParam) : 0;
    const since =
      Number.isFinite(sinceParsed) && sinceParsed >= 0 ? sinceParsed : 0;

    const data = await ctx.runQuery(internal.sync.pull, {
      userId: record.userId,
      since,
    });

    await ctx.runMutation(internal.apiKeys.touch, { id: record._id });

    return jsonResponse(data);
  }),
});

http.route({
  path: "/api/tasks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authResult = await authenticateKey(request);
    if ("error" in authResult) return authResult.error;

    const record = await ctx.runQuery(internal.apiKeys.getByHash, {
      hashedKey: authResult.hashedKey,
    });
    if (!record) return jsonResponse({ error: "Invalid token" }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const result = await ctx.runMutation(internal.sync.createTaskForUser, {
      userId: record.userId,
      input: body as Record<string, unknown>,
    });

    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }

    await ctx.runMutation(internal.apiKeys.touch, { id: record._id });

    return jsonResponse({ id: result.id }, 201);
  }),
});

export default http;

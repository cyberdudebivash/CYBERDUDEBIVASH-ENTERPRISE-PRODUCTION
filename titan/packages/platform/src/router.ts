import type { LeadRepository, NewLead } from "./repositories/types.js";

export interface Dependencies {
  leads: LeadRepository;
}

/**
 * Pure request -> response routing, independent of the Cloudflare Workers
 * runtime (uses only the standard Request/Response/URL APIs, available natively
 * in Node) and independent of D1 (takes a LeadRepository, not an env binding) —
 * so it's testable directly, without workerd. worker.ts is the thin adapter that
 * wires this to a real env at the actual Workers entrypoint.
 */
export async function handleRequest(request: Request, deps: Dependencies): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health" && request.method === "GET") {
    return healthResponse();
  }

  if (url.pathname === "/api/leads" && request.method === "POST") {
    return createLead(request, deps.leads);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

function healthResponse(): Response {
  return Response.json({
    status: "ok",
    service: "titan-platform",
    timestamp: new Date().toISOString(),
  });
}

async function createLead(request: Request, leads: LeadRepository): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateNewLead(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const saved = await leads.save(validation.value);
  return Response.json(saved, { status: 201 });
}

type Validation = { ok: true; value: NewLead } | { ok: false; error: string };

const REQUIRED_STRING_FIELDS = ["name", "email", "company", "timestamp", "source"] as const;

function validateNewLead(value: unknown): Validation {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const record = value as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      return { ok: false, error: `Missing or invalid field: ${field}` };
    }
  }
  if (typeof record.answers !== "object" || record.answers === null) {
    return { ok: false, error: "Missing or invalid field: answers" };
  }
  if (typeof record.result !== "object" || record.result === null) {
    return { ok: false, error: "Missing or invalid field: result" };
  }

  return { ok: true, value: record as unknown as NewLead };
}

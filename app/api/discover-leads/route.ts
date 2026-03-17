import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
}

// ─── Tavily helpers ───────────────────────────────────────────────────────────

function buildTavilyQueries(settore: string, territorio: string, tipoAttivita?: string): string[] {
  const activity = tipoAttivita || settore.toLowerCase();
  return [
    `${activity} ${territorio} sito web contatti`,
    `${activity} ${territorio} PagineBianche`,
    `${settore} imprese ${territorio} Google Maps`,
  ];
}

async function callTavily(query: string): Promise<TavilyResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

function formatTavilyContext(results: TavilyResult[]): string {
  // Deduplicate by hostname
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    try {
      const host = new URL(r.url).hostname;
      if (seen.has(host)) return false;
      seen.add(host);
      return true;
    } catch {
      return true;
    }
  });

  return unique
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content ?? "").slice(0, 400)}`)
    .join("\n\n---\n\n");
}

// ─── Lead parser ──────────────────────────────────────────────────────────────

function parseLeadsFromText(text: string): any[] {
  const leads: any[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("__LEAD__:")) {
      try {
        leads.push(JSON.parse(trimmed.slice("__LEAD__:".length)));
      } catch {}
    }
  }
  return leads;
}

// ─── Shared output rules ──────────────────────────────────────────────────────

const OUTPUT_RULES = `FORMATO OUTPUT — rispetta queste regole alla lettera:
- Per ogni azienda scrivi ESATTAMENTE su una singola riga (nessuna interruzione di riga nel JSON):
  __LEAD__:{"nomeAzienda":"...","settore":"...","territorio":"...","sitoWeb":"...","profiloSocial":"...","note":"..."}
- JSON valido e compatto su una sola riga
- Campi obbligatori: nomeAzienda, settore, territorio
- sitoWeb: URL completo con https:// se disponibile, altrimenti stringa vuota ""
- profiloSocial: URL profilo social principale (Instagram, Facebook, LinkedIn) se disponibile, altrimenti ""
- note: 1-2 osservazioni utili per il commerciale (presenza digitale, punti deboli, opportunità)
- NON scrivere nulla al di fuori delle righe __LEAD__:`;

// ─── System prompts per tier ──────────────────────────────────────────────────

const SYSTEM_TAVILY = `Sei un assistente specializzato nell'estrazione di lead B2B da risultati di ricerca web, per WIDE Digital Agency (agenzia italiana di marketing digitale).

Riceverai risultati di ricerca già effettuata. Estrai da essi le aziende che potrebbero essere lead per WIDE.

${OUTPUT_RULES}
- Nelle note indica cosa emerge dai risultati (es. "Sito web presente ma datato", "Solo Facebook attivo")`;

const SYSTEM_WEBSEARCH = `Sei un assistente specializzato nella ricerca di lead B2B per WIDE Digital Agency (agenzia italiana di marketing digitale).

Usa il tool web_search per trovare aziende reali nel settore e territorio specificati.

${OUTPUT_RULES}
- Nelle note indica cosa hai trovato sulla presenza digitale dell'azienda`;

const SYSTEM_KNOWLEDGE = `Sei un assistente specializzato nella ricerca di lead B2B per WIDE Digital Agency (agenzia italiana di marketing digitale).

Usa la tua conoscenza delle aziende e del tessuto economico italiano per suggerire lead nel settore e territorio specificati.

${OUTPUT_RULES}
- Aggiungi sempre "Da verificare" nelle note di ogni lead, poiché i dati provengono dalla conoscenza base e non da ricerca live`;

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { settore, territorio, tipoAttivita, count = 5, additionalCriteria } = await req.json();

  if (!settore || !territorio) {
    return NextResponse.json({ error: "settore e territorio sono obbligatori" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const userPromptBase = `Trova esattamente ${count} aziende con queste caratteristiche:
- Settore: ${settore}
- Territorio: ${territorio}
${tipoAttivita ? `- Tipo di attività: ${tipoAttivita}` : ""}
${additionalCriteria ? `- Criteri aggiuntivi: ${additionalCriteria}` : ""}

Outputta esattamente ${count} righe __LEAD__:... Nient'altro.`;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      try {

        // ── TIER 1: Tavily ──────────────────────────────────────────────────
        if (process.env.TAVILY_API_KEY) {
          send("Ricerca Tavily in corso...\n");
          try {
            const queries = buildTavilyQueries(settore, territorio, tipoAttivita);
            const settled = await Promise.allSettled(queries.map(callTavily));
            const allResults = settled.flatMap((r) => r.status === "fulfilled" ? r.value : []);

            if (allResults.length > 0) {
              const context = formatTavilyContext(allResults);
              const userPromptTavily = `Dai seguenti risultati di ricerca web, estrai ${count} lead aziendali.

RISULTATI DI RICERCA:
${context}

${userPromptBase}`;

              const tavilyStream = await client.messages.stream({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                system: SYSTEM_TAVILY,
                messages: [{ role: "user", content: userPromptTavily }],
              });

              let tavilyText = "";
              for await (const event of tavilyStream) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  tavilyText += event.delta.text;
                  send(event.delta.text);
                }
              }

              if (parseLeadsFromText(tavilyText).length > 0) {
                send("\n__DONE__");
                controller.close();
                return;
              }
              // Results came but Claude extracted nothing useful — fall through
            }
            send("\nNessun risultato da Tavily, cambio strategia...\n");
          } catch {
            send("\nTavily non disponibile, cambio strategia...\n");
          }
        }

        // ── TIER 2: Anthropic web_search ────────────────────────────────────
        send("Ricerca con web search...\n");
        try {
          // Non-streaming: collect full response to detect if tool actually produced leads
          const wsResponse = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: SYSTEM_WEBSEARCH,
            tools: [
              { type: "web_search_20250305" as any, name: "web_search", max_uses: 6 } as any,
            ],
            messages: [{ role: "user", content: userPromptBase }],
          });

          const wsText = wsResponse.content
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("\n");

          const wsLeads = parseLeadsFromText(wsText);
          if (wsLeads.length > 0) {
            for (const lead of wsLeads) {
              send(`__LEAD__:${JSON.stringify(lead)}\n`);
            }
            send("\n__DONE__");
            controller.close();
            return;
          }
          send("\nWeb search non ha prodotto lead, uso conoscenza base...\n");
        } catch {
          send("\nWeb search non disponibile, uso conoscenza base...\n");
        }

        // ── TIER 3: Knowledge-only ───────────────────────────────────────────
        send("Generazione da conoscenza base...\n");
        const kStream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: SYSTEM_KNOWLEDGE,
          messages: [{ role: "user", content: userPromptBase }],
        });

        for await (const event of kStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(event.delta.text);
          }
        }

        send("\n__DONE__");
        controller.close();

      } catch (err: any) {
        send(`\n__ERROR__:${err.message}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

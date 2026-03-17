import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Anthropic from "@anthropic-ai/sdk";
import { updateLead, createReport } from "@/lib/notion";
import { createHash } from "crypto";

// Simple in-memory rate limiter: max 10 req/hour per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 3600 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = session.user?.email ?? "unknown";
  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { error: "Rate limit superato. Massimo 10 report per ora." },
      { status: 429 },
    );
  }

  const { leadId, companyName, sector, territory, sitoWeb, profiloSocial, note, additionalInfo } =
    await req.json();

  if (!leadId || !companyName) {
    return NextResponse.json(
      { error: "leadId e companyName sono obbligatori" },
      { status: 400 },
    );
  }

  // Update lead status
  await updateLead(leadId, { stato: "Report in lavorazione" }).catch(() => {});

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `Sei l'analista digitale di WIDE Digital Agency, agenzia italiana specializzata in marketing digitale, web design e crescita online per PMI e attività locali.

Il tuo compito è produrre report di analisi digitale destinati direttamente ai potenziali clienti di WIDE. Il documento viene mostrato al cliente con il branding WIDE — deve essere professionale, credibile e convincente.

IDENTITÀ WIDE:
- Lavoriamo con PMI italiane, attività locali, professionisti e piccole imprese
- Ci differenziamo per approccio concreto, orientato ai risultati e alla crescita reale
- Non vendiamo promesse: vendiamo analisi precise e azioni misurabili
- Il nostro target è chi vuole crescere online ma non sa da dove iniziare

TONO DI VOCE:
- Diretto e professionale, mai aggressivo
- Specifico: ogni dato deve essere reale o plausibilmente stimato, mai generico
- Orientato al business: ogni criticità ha un impatto economico, ogni azione ha un beneficio concreto
- Autorevole ma accessibile: chi legge non è un tecnico digitale

FORMATO OUTPUT — rispetta ESATTAMENTE questa struttura markdown:

## 1. Presenza Digitale Attuale

[Analisi dettagliata in 3-4 paragrafi: sito web (esiste? mobile-friendly? velocità percepita? CTA chiare? contenuti aggiornati?), Google Business Profile (presente? recensioni? voto medio? foto? risponde ai commenti?), social media (Instagram, Facebook, LinkedIn, TikTok: follower, frequenza post, qualità contenuti, ultimo aggiornamento), campagne ads o presenza sponsorizzata rilevabile]

**Valutazione complessiva: [ASSENTE | DEBOLE | MEDIA | BUONA | ECCELLENTE]**

## 2. Criticità Rilevate

[Intro breve opzionale]

### [Nome criticità 1]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Urgenza:** [ALTA | MEDIA | BASSA]
[Descrizione del problema in 2-3 righe: cos'è, perché conta, conseguenza concreta sul business]

### [Nome criticità 2]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Urgenza:** [ALTA | MEDIA | BASSA]
[Descrizione]

[Aggiungi 3-5 criticità totali]

## 3. Benchmark Competitor

[Intro breve: perché questo confronto è rilevante]

### [Nome Competitor 1]
[Analisi in 2-3 righe: punti di forza digitali specifici, cosa fanno bene, vantaggio competitivo stimato rispetto all'azienda analizzata]

### [Nome Competitor 2]
[Analisi]

### [Nome Competitor 3]
[Analisi]

## 4. Opportunità e Azioni Consigliate

[Intro breve]

### [Titolo Azione 1]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Difficoltà:** [ALTA | MEDIA | BASSA]
[Descrizione dell'azione in 2-3 righe: cosa fare, come farlo, risultato atteso]

### [Titolo Azione 2]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Difficoltà:** [ALTA | MEDIA | BASSA]
[Descrizione]

[Aggiungi 4-6 azioni totali, ordinate per priorità]

## 5. Executive Summary

[Paragrafo unico di 5-6 righe. Struttura: 1) situazione attuale in una frase diretta e cruda, 2) rischio concreto del non agire nei prossimi 6-12 mesi, 3) opportunità principale disponibile ora, 4) perché WIDE è il partner giusto per coglierla. Tono autorevole, nessuna promessa vaga.]`;

  const userPrompt = `Produci il report di analisi digitale completo per questa azienda.

DATI AZIENDA:
- Nome: ${companyName}
- Settore: ${sector || "Non specificato"}
- Territorio: ${territory || "Non specificato"}
${sitoWeb ? `- Sito web: ${sitoWeb}` : "- Sito web: non fornito"}
${profiloSocial ? `- Profilo social principale: ${profiloSocial}` : ""}
${note ? `- Note interne: ${note}` : ""}
${additionalInfo ? `- Informazioni aggiuntive: ${additionalInfo}` : ""}

IMPORTANTE: usa i dati forniti sopra come punto di partenza reale. Se il sito web è indicato, l'azienda CE L'HA — analizzane il contenuto, la qualità e le lacune. Non affermare mai che manca qualcosa che è esplicitamente fornito nei dati.

Usa la struttura e il formato markdown esatti indicati nel system prompt.`;

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: systemPrompt,
          tools: [
            {
              type: "web_search_20250305" as any,
              name: "web_search",
              max_uses: 5,
            } as any,
          ],
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullContent += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Save report to Notion
        const token = createHash("sha256")
          .update(leadId + (process.env.NEXTAUTH_SECRET ?? "secret"))
          .digest("hex")
          .slice(0, 16);

        const report = await createReport({
          titolo: `Analisi Digitale — ${companyName}`,
          azienda: companyName,
          settore: sector,
          leadId,
          contenuto: fullContent,
          token,
        });

        await updateLead(leadId, {
          stato: "Report completato",
          urlReport: `/r/${report.id}`,
        }).catch(() => {});

        // Send report ID to client
        controller.enqueue(encoder.encode(`\n__REPORT_ID__:${report.id}`));
        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n__ERROR__:${err.message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Anthropic from "@anthropic-ai/sdk";
import { updateLead, createReport, logAction } from "@/lib/db";
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

  const { leadId, companyName, sector, territory, sitoWeb, profiloSocial, profiloSocial2, profiloSocial3, note, additionalInfo } =
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

  const systemPrompt = `Sei l'analista digitale senior di WIDE Digital Agency. Il tuo obiettivo è produrre un report di analisi digitale estremamente preciso, basato su dati REALI e verificabili.

REGOLA FONDAMENTALE SULLA VERIDICITÀ DEI DATI:
- Se un sito web o un profilo social è fornito nei dati dell'azienda, DEVI considerarlo esistente e analizzarlo.
- Se i dati dicono che l'azienda HA un sito, non puoi scrivere "l'azienda non ha un sito".
- Se i dati sono parziali, usa lo strumento 'web_search' per verificare la reale presenza online dell'azienda, i suoi profili (FB, IG, LI, TikTok) e il suo posizionamento.
- Un report con dati errati distrugge la credibilità di WIDE. Se non sei sicuro di un dato, cercalo o usa un linguaggio probabilistico basato sull'osservazione ("Sembrerebbe che...", "Dalle analisi effettuate risulta che...").

IDENTITÀ WIDE:
- Agenzia concreta, orientata alla crescita reale di PMI e attività locali.
- Non vendiamo sogni, vendiamo strategie basate su lacune digitali concrete.

TONO DI VOCE:
- Professionale, autorevole, diretto.
- Persuasivo ma basato su fatti: ogni criticità deve avere una conseguenza di business chiara.

FORMATO OUTPUT — rispetta ESATTAMENTE questa struttura markdown:

## 1. Presenza Digitale Attuale

[Analisi dettagliata in 3-4 paragrafi: sito web (mobile-friendly, velocità, UX, conversioni), Google Business Profile (visibilità locale, recensioni), social media (analisi dei profili esistenti, frequenza, engagement), posizionamento SEO di base].

**Valutazione complessiva: [ASSENTE | DEBOLE | MEDIA | BUONA | ECCELLENTE]**

## 2. Criticità Rilevate

### [Nome criticità 1]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Urgenza:** [ALTA | MEDIA | BASSA]
[Descrizione tecnica e impatto sul business]

### [Nome criticità 2]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Urgenza:** [ALTA | MEDIA | BASSA]
[Descrizione]

[Aggiungi 3-5 criticità totali]

## 3. Benchmark Competitor

### [Nome Competitor 1]
[Analisi di cosa fanno meglio digitalmente e perché stanno sottraendo quote di mercato]

### [Nome Competitor 2]
[Analisi]

### [Nome Competitor 3]
[Analisi]

## 4. Opportunità e Azioni Consigliate

### [Titolo Azione 1]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Difficoltà:** [ALTA | MEDIA | BASSA]
[Cosa fare e quale beneficio porterà]

### [Titolo Azione 2]
- **Impatto:** [ALTO | MEDIO | BASSO]
- **Difficoltà:** [ALTA | MEDIA | BASSA]
[Descrizione]

[Aggiungi 4-6 azioni totali]

## 5. Executive Summary

[Sintesi finale di 5-6 righe: stato dell'arte, rischio di inerzia, opportunità immediata, perché WIDE è il partner necessario.]`;

  const userPrompt = `Analizza questa azienda e produci il report WIDE completo.

DATI AZIENDA DA ANALIZZARE:
- Nome: ${companyName}
- Settore: ${sector || "Non specificato"}
- Territorio: ${territory || "Non specificato"}
${sitoWeb ? `- Sito web fornito: ${sitoWeb}` : "- Sito web non fornito inizialmente"}
${profiloSocial ? `- Profilo social 1: ${profiloSocial}` : ""}
${profiloSocial2 ? `- Profilo social 2: ${profiloSocial2}` : ""}
${profiloSocial3 ? `- Profilo social 3: ${profiloSocial3}` : ""}
${note ? `- Note interne: ${note}` : ""}
${additionalInfo ? `- Informazioni aggiuntive: ${additionalInfo}` : ""}

ISTRUZIONI CRITICHE PER IL REPORT:
1. USA LA RICERCA WEB: Cerca "${companyName}" nel territorio "${territory}" per confermare dati, trovare profili social mancanti o verificare lo stato del sito.
2. COERENZA TOTALE: Se sopra è indicato un sito web, il report deve analizzare QUEL sito. NON dire che manca.
3. SPECIFICITÀ: Evita banalità. Se un sito è lento, scrivi perché (es. immagini non ottimizzate, hosting obsoleto).
4. IMPATTO: Spiega sempre AL CLIENTE perché una mancanza (es. poche recensioni) gli fa perdere soldi oggi.`;

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

        // Save report to Supabase
        const token = createHash("sha256")
          .update(leadId + (process.env.NEXTAUTH_SECRET ?? "secret"))
          .digest("hex")
          .slice(0, 16);

        const report = await createReport({
          titolo: `${companyName} — Analisi Digitale`,
          azienda: companyName,
          settore: sector,
          leadId,
          contenuto: fullContent,
          token,
          generatoDa: email,
        });

        await updateLead(leadId, {
          stato: "Report completato",
          urlReport: `/r/${report.id}`,
          dataCreazioneReport: new Date().toISOString().split("T")[0],
        }).catch(() => {});

        logAction({
          azione: "Generazione Report" as any,
          entita: "Report",
          nomeEntita: `${companyName} — Analisi Digitale`,
          entitaId: report.id,
          eseguitaDa: email,
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

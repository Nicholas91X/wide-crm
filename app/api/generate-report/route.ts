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

  const { leadId, companyName, sector, territory, additionalInfo } =
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

  const systemPrompt = `Sei un analista senior di digital marketing. Analizza la presenza digitale dell'azienda indicata e produci un report strutturato professionale. Fai ricerche approfondite su sito web, social media, Google Business Profile, recensioni online e competitor territoriali. Sii specifico, concreto e orientato al business. Evita generalizzazioni.`;

  const userPrompt = `Analizza la presenza digitale di questa azienda e produci un report completo.

DATI AZIENDA:
- Nome: ${companyName}
- Settore: ${sector || "Non specificato"}
- Territorio: ${territory || "Non specificato"}
${additionalInfo ? `- Info aggiuntive: ${additionalInfo}` : ""}

Struttura il report in 5 sezioni:

## 1. PRESENZA DIGITALE ATTUALE
Analizza: sito web (esiste? mobile-friendly? CTA? aggiornamento), Google Business Profile (presente? recensioni? voto medio?), social media (Instagram, Facebook, LinkedIn, TikTok: follower, frequenza, qualità, ultimo post), campagne ads attive rilevabili. Concludi con valutazione: ASSENTE / DEBOLE / MEDIA / BUONA / ECCELLENTE.

## 2. CRITICITÀ RILEVATE
Elenca in ordine di impatto le lacune digitali principali. Per ognuna: descrizione problema, impatto sul business, urgenza (ALTA/MEDIA/BASSA).

## 3. BENCHMARK COMPETITOR
Identifica 3 competitor diretti nella stessa area e settore con presenza digitale più consolidata. Per ognuno: nome, punti di forza digitali specifici, vantaggio competitivo stimato.

## 4. OPPORTUNITÀ E AZIONI CONSIGLIATE
Proponi 4-6 azioni concrete prioritizzate. Per ognuna: titolo, descrizione 2-3 righe, impatto atteso (ALTO/MEDIO/BASSO), difficoltà implementazione (ALTA/MEDIA/BASSA).

## 5. EXECUTIVE SUMMARY
Paragrafo di 5-6 righe: situazione attuale in una frase diretta, rischio concreto del non agire, opportunità principale disponibile ora. Tono diretto, professionale, orientato al business.`;

  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: systemPrompt,
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

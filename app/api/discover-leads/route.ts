import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Anthropic from "@anthropic-ai/sdk";

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

  const systemPrompt = `Sei un assistente specializzato nella ricerca di lead B2B per WIDE Digital Agency, agenzia italiana di marketing digitale e web design.

Il tuo compito è trovare aziende reali nel territorio e settore specificati che potrebbero beneficiare dei servizi WIDE (sito web, social media, SEO, advertising).

MODALITÀ OPERATIVA:
- Se hai accesso a web_search, usalo per trovare aziende reali verificabili su Google Maps, PagineBianche, directory locali, siti di categoria.
- Se web_search non è disponibile o non funziona, usa la tua conoscenza delle aziende italiane nel settore/territorio indicati. In quel caso aggiungi "Da verificare" nelle note di ogni lead.
- In entrambi i casi DEVI produrre i lead richiesti: non bloccarti mai.

FORMATO OUTPUT — rispetta queste regole alla lettera:
- Per ogni azienda scrivi ESATTAMENTE su una singola riga (nessuna interruzione):
  __LEAD__:{"nomeAzienda":"...","settore":"...","territorio":"...","sitoWeb":"...","profiloSocial":"...","note":"..."}
- Il JSON deve essere valido e compatto su una sola riga
- Campi obbligatori: nomeAzienda, settore, territorio
- sitoWeb: URL completo con https:// se noto, altrimenti ""
- profiloSocial: URL profilo social principale se noto, altrimenti ""
- note: 1-2 osservazioni utili per il commerciale (presenza digitale, punti deboli, opportunità)
- Dopo l'ultimo lead scrivi su una riga: __DONE__
- NON scrivere altro testo, spiegazioni o commenti al di fuori dei __LEAD__: e __DONE__`;

  const userPrompt = `Trova esattamente ${count} aziende con queste caratteristiche:
- Settore: ${settore}
- Territorio: ${territorio}
${tipoAttivita ? `- Tipo di attività: ${tipoAttivita}` : ""}
${additionalCriteria ? `- Criteri aggiuntivi: ${additionalCriteria}` : ""}

Outputta esattamente ${count} righe __LEAD__:... poi __DONE__. Nient'altro.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          tools: [
            {
              type: "web_search_20250305" as any,
              name: "web_search",
              max_uses: 8,
            } as any,
          ],
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

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
    },
  });
}

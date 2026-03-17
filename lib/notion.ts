import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const PIPELINE_DB = process.env.NOTION_PIPELINE_DB_ID!;
const REPORTS_DB = process.env.NOTION_REPORTS_DB_ID!;
const CLIENTS_DB = process.env.NOTION_CLIENTS_DB_ID!;
const SEARCHES_DB = process.env.NOTION_SEARCHES_DB_ID!;
const AUDIT_DB = process.env.NOTION_AUDIT_DB_ID!;

// ─── Helpers ────────────────────────────────────────────────────────────────

function richText(page: any, key: string): string {
  const p = page.properties?.[key];
  if (!p) return "";
  if (p.type === "title") return p.title?.[0]?.plain_text ?? "";
  if (p.type === "rich_text") return p.rich_text?.[0]?.plain_text ?? "";
  return "";
}

function selectVal(page: any, key: string): string {
  return page.properties?.[key]?.select?.name ?? "";
}

function numberVal(page: any, key: string): number {
  return page.properties?.[key]?.number ?? 0;
}

function dateVal(page: any, key: string): string {
  return page.properties?.[key]?.date?.start ?? "";
}

function urlVal(page: any, key: string): string {
  return page.properties?.[key]?.url ?? "";
}

// ─── Pipeline Lead mapping ────────────────────────────────────────────────────
// Actual Notion schema:
//   Nome Azienda (title), Settore (select), Territorio (text/rich_text),
//   Sito Web (url), Profilo Social (url), Canale primo contatto (select),
//   Note (text/rich_text), Score Qualificazione (select: 🔴 Basso/🟡 Medio/🟢 Alto),
//   Stato (select), Data primo contatto (date), Data follow-up (date),
//   Risposta (select: In attesa/Positiva/Negativa/Silenzio), URL Report (url)

function mapLead(page: any) {
  return {
    id: page.id,
    createdTime: page.created_time,
    lastEdited: page.last_edited_time,
    nomeAzienda: richText(page, "Nome Azienda"),
    settore: selectVal(page, "Settore"),
    territorio: richText(page, "Territorio"),
    sitoWeb: urlVal(page, "Sito Web"),
    profiloSocial: urlVal(page, "Profilo Social"),
    profiloSocial2: urlVal(page, "Profilo Social 2"),
    profiloSocial3: urlVal(page, "Profilo Social 3"),
    canale: selectVal(page, "Canale primo contatto"),
    note: richText(page, "Note"),
    score: selectVal(page, "Score Qualificazione"),
    stato: selectVal(page, "Stato"),
    dataCreazioneReport: dateVal(page, "Data creazione report"),
    dataPrimoContatto: dateVal(page, "Data primo contatto"),
    dataSecondoContatto: dateVal(page, "Data secondo contatto"),
    dataFollowUp: dateVal(page, "Data follow-up"),
    risposta: selectVal(page, "Risposta"),
    urlReport: urlVal(page, "URL Report"),
    inseritoDA: richText(page, "Inserito da"),
  };
}

// ─── Report mapping ───────────────────────────────────────────────────────────
// Actual Notion schema:
//   Titolo Report (title), Azienda (text), Settore (select), Lead ID (text),
//   Token (text), Stato (select), Esito (select), Data generazione (date),
//   URL Pagina Report (url), Note (text)
//   Content stored as page body blocks

function mapReport(page: any) {
  return {
    id: page.id,
    createdTime: page.created_time,
    titolo: richText(page, "Titolo Report"),
    azienda: richText(page, "Azienda"),
    settore: selectVal(page, "Settore"),
    leadId: richText(page, "Lead ID"),
    token: richText(page, "Token"),
    stato: selectVal(page, "Stato"),
    esito: selectVal(page, "Esito"),
    dataGenerazione: dateVal(page, "Data generazione"),
    urlPagina: urlVal(page, "URL Pagina Report"),
    generatoDa: richText(page, "Generato da"),
    contenuto: "", // populated separately via fetchReportContent()
  };
}

// ─── Client mapping ───────────────────────────────────────────────────────────
// Actual Notion schema:
//   Nome Cliente (title), Settore (select), Valore mensile (number),
//   Data inizio (date), Prossimo rinnovo (date), Stato contratto (select),
//   Responsabile (text), Sito Web (url), Note (text)

function mapClient(page: any) {
  return {
    id: page.id,
    createdTime: page.created_time,
    nome: richText(page, "Nome Cliente"),
    settore: selectVal(page, "Settore"),
    valoreNetto: numberVal(page, "Valore mensile"),
    dataInizio: dateVal(page, "Data inizio"),
    prossimoRinnovo: dateVal(page, "Prossimo rinnovo"),
    statoContratto: selectVal(page, "Stato contratto"),
    responsabile: richText(page, "Responsabile"),
    note: richText(page, "Note"),
    sitoWeb: urlVal(page, "Sito Web"),
  };
}

// ─── Report content helpers (page blocks) ─────────────────────────────────────

async function fetchReportContent(pageId: string): Promise<string> {
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
    const lines: string[] = [];
    for (const block of blocks.results as any[]) {
      const type = block.type;
      const richArr = block[type]?.rich_text ?? [];
      const text = richArr.map((r: any) => r.plain_text).join("");
      if (type === "heading_1") lines.push(`# ${text}`);
      else if (type === "heading_2") lines.push(`## ${text}`);
      else if (type === "heading_3") lines.push(`### ${text}`);
      else if (type === "bulleted_list_item") lines.push(`- ${text}`);
      else if (type === "numbered_list_item") lines.push(`1. ${text}`);
      else if (text) lines.push(text);
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

// Split content into Notion paragraph blocks (max 2000 chars each)
function contentToBlocks(content: string) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  const blocks: any[] = [];

  for (const para of paragraphs) {
    // Detect markdown headings
    if (para.startsWith("## ")) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: para.slice(3).slice(0, 2000) } }] } });
    } else if (para.startsWith("# ")) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: para.slice(2).slice(0, 2000) } }] } });
    } else {
      // Split long paragraphs into 2000-char chunks
      const chunks = para.match(/.{1,2000}/gs) ?? [para];
      for (const chunk of chunks) {
        blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: chunk } }] } });
      }
    }
  }

  return blocks;
}

// ─── Leads ──────────────────────────────────────────────────────────────────

export async function getLeads(filters?: {
  settore?: string;
  score?: string;
  stato?: string;
  territorio?: string;
}) {
  const conditions: any[] = [];

  if (filters?.settore)
    conditions.push({ property: "Settore", select: { equals: filters.settore } });
  if (filters?.stato)
    conditions.push({ property: "Stato", select: { equals: filters.stato } });
  if (filters?.territorio)
    conditions.push({ property: "Territorio", rich_text: { contains: filters.territorio } });
  if (filters?.score)
    conditions.push({ property: "Score Qualificazione", select: { equals: filters.score } });

  const response = await notion.databases.query({
    database_id: PIPELINE_DB,
    filter:
      conditions.length === 0
        ? undefined
        : conditions.length === 1
        ? conditions[0]
        : { and: conditions },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });

  return response.results.map(mapLead);
}

export async function getLead(id: string) {
  const page = await notion.pages.retrieve({ page_id: id });
  return mapLead(page);
}

export async function createLead(data: {
  nomeAzienda: string;
  settore?: string;
  territorio: string;
  sitoWeb?: string;
  profiloSocial?: string;
  profiloSocial2?: string;
  profiloSocial3?: string;
  canale?: string;
  note?: string;
  inseritoDA?: string;
}) {
  const page = await notion.pages.create({
    parent: { database_id: PIPELINE_DB },
    properties: {
      "Nome Azienda": { title: [{ text: { content: data.nomeAzienda } }] },
      ...(data.settore && { Settore: { select: { name: data.settore } } }),
      ...(data.territorio && { Territorio: { rich_text: [{ text: { content: data.territorio } }] } }),
      ...(data.sitoWeb && { "Sito Web": { url: data.sitoWeb } }),
      ...(data.profiloSocial && { "Profilo Social": { url: data.profiloSocial } }),
      ...(data.profiloSocial2 && { "Profilo Social 2": { url: data.profiloSocial2 } }),
      ...(data.profiloSocial3 && { "Profilo Social 3": { url: data.profiloSocial3 } }),
      ...(data.canale && { "Canale primo contatto": { select: { name: data.canale } } }),
      ...(data.note && { Note: { rich_text: [{ text: { content: data.note } }] } }),
      ...(data.inseritoDA && { "Inserito da": { rich_text: [{ text: { content: data.inseritoDA } }] } }),
      Stato: { select: { name: "Da contattare" } },
    },
  });
  return mapLead(page);
}

export async function updateLead(
  id: string,
  data: Partial<{
    nomeAzienda: string;
    settore: string;
    territorio: string;
    sitoWeb: string;
    profiloSocial: string;
    profiloSocial2: string;
    profiloSocial3: string;
    canale: string;
    note: string;
    score: string;
    stato: string;
    dataCreazioneReport: string;
    dataPrimoContatto: string;
    dataSecondoContatto: string;
    dataFollowUp: string;
    risposta: string;
    urlReport: string;
  }>
) {
  const props: any = {};
  if (data.nomeAzienda !== undefined)
    props["Nome Azienda"] = { title: [{ text: { content: data.nomeAzienda } }] };
  if (data.settore !== undefined)
    props["Settore"] = { select: { name: data.settore } };
  if (data.territorio !== undefined)
    props["Territorio"] = { rich_text: [{ text: { content: data.territorio } }] };
  if (data.sitoWeb !== undefined)
    props["Sito Web"] = { url: data.sitoWeb || null };
  if (data.profiloSocial !== undefined)
    props["Profilo Social"] = { url: data.profiloSocial || null };
  if (data.profiloSocial2 !== undefined)
    props["Profilo Social 2"] = { url: data.profiloSocial2 || null };
  if (data.profiloSocial3 !== undefined)
    props["Profilo Social 3"] = { url: data.profiloSocial3 || null };
  if (data.canale !== undefined)
    props["Canale primo contatto"] = { select: { name: data.canale } };
  if (data.note !== undefined)
    props["Note"] = { rich_text: [{ text: { content: data.note } }] };
  if (data.score !== undefined)
    props["Score Qualificazione"] = data.score ? { select: { name: data.score } } : { select: null };
  if (data.stato !== undefined)
    props["Stato"] = { select: { name: data.stato } };
  if (data.dataCreazioneReport !== undefined)
    props["Data creazione report"] = data.dataCreazioneReport ? { date: { start: data.dataCreazioneReport } } : { date: null };
  if (data.dataPrimoContatto !== undefined)
    props["Data primo contatto"] = data.dataPrimoContatto ? { date: { start: data.dataPrimoContatto } } : { date: null };
  if (data.dataSecondoContatto !== undefined)
    props["Data secondo contatto"] = data.dataSecondoContatto ? { date: { start: data.dataSecondoContatto } } : { date: null };
  if (data.dataFollowUp !== undefined)
    props["Data follow-up"] = data.dataFollowUp ? { date: { start: data.dataFollowUp } } : { date: null };
  if (data.risposta !== undefined)
    props["Risposta"] = data.risposta ? { select: { name: data.risposta } } : { select: null };
  if (data.urlReport !== undefined)
    props["URL Report"] = { url: data.urlReport || null };

  const page = await notion.pages.update({ page_id: id, properties: props });
  return mapLead(page);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(filters?: {
  stato?: string;
  esito?: string;
  settore?: string;
}) {
  const conditions: any[] = [];
  if (filters?.stato)
    conditions.push({ property: "Stato", select: { equals: filters.stato } });
  if (filters?.esito)
    conditions.push({ property: "Esito", select: { equals: filters.esito } });
  if (filters?.settore)
    conditions.push({ property: "Settore", select: { equals: filters.settore } });

  const response = await notion.databases.query({
    database_id: REPORTS_DB,
    filter:
      conditions.length === 0
        ? undefined
        : conditions.length === 1
        ? conditions[0]
        : { and: conditions },
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });

  return response.results.map(mapReport);
}

export async function getReport(id: string) {
  const [page, content] = await Promise.all([
    notion.pages.retrieve({ page_id: id }),
    fetchReportContent(id),
  ]);
  const report = mapReport(page);
  report.contenuto = content;
  return report;
}

export async function getReportByLeadId(leadId: string) {
  const response = await notion.databases.query({
    database_id: REPORTS_DB,
    filter: { property: "Lead ID", rich_text: { equals: leadId } },
  });
  if (response.results.length === 0) return null;
  const report = mapReport(response.results[0]);
  report.contenuto = await fetchReportContent(response.results[0].id);
  return report;
}

export async function createReport(data: {
  titolo: string;
  azienda: string;
  settore?: string;
  leadId: string;
  contenuto: string;
  token: string;
  urlPagina?: string;
  generatoDa?: string;
}) {
  const page = await notion.pages.create({
    parent: { database_id: REPORTS_DB },
    properties: {
      "Titolo Report": { title: [{ text: { content: data.titolo } }] },
      Azienda: { rich_text: [{ text: { content: data.azienda } }] },
      ...(data.settore && { Settore: { select: { name: data.settore } } }),
      "Lead ID": { rich_text: [{ text: { content: data.leadId } }] },
      Token: { rich_text: [{ text: { content: data.token } }] },
      Stato: { select: { name: "Bozza" } },
      Esito: { select: { name: "In attesa" } },
      "Data generazione": { date: { start: new Date().toISOString().split("T")[0] } },
      ...(data.urlPagina && { "URL Pagina Report": { url: data.urlPagina } }),
      ...(data.generatoDa && { "Generato da": { rich_text: [{ text: { content: data.generatoDa } }] } }),
    },
    // Store content as page body blocks
    children: contentToBlocks(data.contenuto),
  });

  const report = mapReport(page);
  report.contenuto = data.contenuto;
  return report;
}

// ─── Search Logs ──────────────────────────────────────────────────────────────

function mapSearchLog(page: any) {
  return {
    id: page.id,
    createdTime: page.created_time,
    titolo: richText(page, "Titolo"),
    settore: selectVal(page, "Settore"),
    territorio: richText(page, "Territorio"),
    tipoAttivita: richText(page, "Tipo Attività"),
    criteriAggiuntivi: richText(page, "Criteri Aggiuntivi"),
    numRichiesti: numberVal(page, "Num Richiesti"),
    numTrovati: numberVal(page, "Num Trovati"),
    numAggiunti: numberVal(page, "Num Aggiunti"),
    effettuataDa: richText(page, "Effettuata Da"),
    dataRicerca: dateVal(page, "Data Ricerca"),
    metodo: selectVal(page, "Metodo"),
    leads: [] as any[],
  };
}

export async function getSearchLogs() {
  const response = await notion.databases.query({
    database_id: SEARCHES_DB,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 50,
  });
  return response.results.map(mapSearchLog);
}

export async function getSearchLog(id: string) {
  const [page, blocks] = await Promise.all([
    notion.pages.retrieve({ page_id: id }),
    notion.blocks.children.list({ block_id: id, page_size: 1 }),
  ]);
  const log = mapSearchLog(page);
  // Leads stored as first paragraph block (JSON)
  const firstBlock = (blocks.results as any[])[0];
  if (firstBlock?.type === "paragraph") {
    const text = firstBlock.paragraph.rich_text?.[0]?.plain_text ?? "";
    try { log.leads = JSON.parse(text); } catch {}
  }
  return log;
}

export async function createSearchLog(data: {
  titolo: string;
  settore?: string;
  territorio: string;
  tipoAttivita?: string;
  criteriAggiuntivi?: string;
  numRichiesti: number;
  numTrovati: number;
  numAggiunti: number;
  effettuataDa: string;
  metodo: string;
  leads: any[];
}) {
  const leadsJson = JSON.stringify(data.leads);
  // Split JSON into ≤2000 char chunks for Notion blocks
  const chunks = leadsJson.match(/.{1,2000}/gs) ?? [leadsJson];

  const page = await notion.pages.create({
    parent: { database_id: SEARCHES_DB },
    properties: {
      Titolo: { title: [{ text: { content: data.titolo } }] },
      ...(data.settore && { Settore: { select: { name: data.settore } } }),
      Territorio: { rich_text: [{ text: { content: data.territorio } }] },
      ...(data.tipoAttivita && { "Tipo Attività": { rich_text: [{ text: { content: data.tipoAttivita } }] } }),
      ...(data.criteriAggiuntivi && { "Criteri Aggiuntivi": { rich_text: [{ text: { content: data.criteriAggiuntivi } }] } }),
      "Num Richiesti": { number: data.numRichiesti },
      "Num Trovati": { number: data.numTrovati },
      "Num Aggiunti": { number: data.numAggiunti },
      "Effettuata Da": { rich_text: [{ text: { content: data.effettuataDa } }] },
      "Data Ricerca": { date: { start: new Date().toISOString().split("T")[0] } },
      ...(data.metodo && { Metodo: { select: { name: data.metodo } } }),
    },
    children: chunks.map((chunk) => ({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: chunk } }] },
    })),
  });

  return mapSearchLog(page);
}

export async function deleteLead(id: string) {
  await notion.pages.update({ page_id: id, archived: true });
}

export async function deleteReport(id: string) {
  await notion.pages.update({ page_id: id, archived: true });
}

export async function updateReport(
  id: string,
  data: Partial<{ stato: string; esito: string }>
) {
  const props: any = {};
  if (data.stato) props["Stato"] = { select: { name: data.stato } };
  if (data.esito) props["Esito"] = { select: { name: data.esito } };

  const page = await notion.pages.update({ page_id: id, properties: props });
  const report = mapReport(page);
  report.contenuto = await fetchReportContent(id);
  return report;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients() {
  const response = await notion.databases.query({
    database_id: CLIENTS_DB,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
  });
  return response.results.map(mapClient);
}

export async function createClient(data: {
  nome: string;
  settore?: string;
  valoreNetto?: number;
  dataInizio?: string;
  responsabile?: string;
}) {
  const page = await notion.pages.create({
    parent: { database_id: CLIENTS_DB },
    properties: {
      "Nome Cliente": { title: [{ text: { content: data.nome } }] },
      ...(data.settore && { Settore: { select: { name: data.settore } } }),
      ...(data.valoreNetto !== undefined && { "Valore mensile": { number: data.valoreNetto } }),
      ...(data.dataInizio && { "Data inizio": { date: { start: data.dataInizio } } }),
      ...(data.responsabile && { Responsabile: { rich_text: [{ text: { content: data.responsabile } }] } }),
      "Stato contratto": { select: { name: "Attivo" } },
    },
  });
  return mapClient(page);
}

export async function getClient(id: string) {
  const page = await notion.pages.retrieve({ page_id: id });
  return mapClient(page);
}

export async function updateClient(
  id: string,
  data: Partial<{
    nome: string;
    settore: string;
    valoreNetto: number;
    dataInizio: string;
    prossimoRinnovo: string;
    statoContratto: string;
    responsabile: string;
    sitoWeb: string;
    note: string;
  }>
) {
  const props: any = {};
  if (data.nome !== undefined) props["Nome Cliente"] = { title: [{ text: { content: data.nome } }] };
  if (data.settore !== undefined) props["Settore"] = { select: { name: data.settore } };
  if (data.valoreNetto !== undefined) props["Valore mensile"] = { number: data.valoreNetto };
  if (data.dataInizio !== undefined) props["Data inizio"] = data.dataInizio ? { date: { start: data.dataInizio } } : { date: null };
  if (data.prossimoRinnovo !== undefined) props["Prossimo rinnovo"] = data.prossimoRinnovo ? { date: { start: data.prossimoRinnovo } } : { date: null };
  if (data.statoContratto !== undefined) props["Stato contratto"] = { select: { name: data.statoContratto } };
  if (data.responsabile !== undefined) props["Responsabile"] = { rich_text: [{ text: { content: data.responsabile } }] };
  if (data.sitoWeb !== undefined) props["Sito Web"] = { url: data.sitoWeb || null };
  if (data.note !== undefined) props["Note"] = { rich_text: [{ text: { content: data.note } }] };
  const page = await notion.pages.update({ page_id: id, properties: props });
  return mapClient(page);
}

export async function deleteClient(id: string) {
  await notion.pages.update({ page_id: id, archived: true });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAzione = "Creazione" | "Modifica" | "Cancellazione" | "Generazione" | "Ricerca" | "Accesso";
export type AuditEntita = "Lead" | "Report" | "Cliente" | "Ricerca Lead";

export async function logAction(data: {
  azione: AuditAzione;
  entita: AuditEntita;
  nomeEntita: string;
  entitaId?: string;
  eseguitaDa: string;
  dettagli?: string;
}) {
  if (!AUDIT_DB) return;
  try {
    await notion.pages.create({
      parent: { database_id: AUDIT_DB },
      properties: {
        Titolo: { title: [{ text: { content: `${data.azione} ${data.entita}: ${data.nomeEntita}` } }] },
        Azione: { select: { name: data.azione } },
        "Entità": { select: { name: data.entita } },
        "Nome Entità": { rich_text: [{ text: { content: data.nomeEntita.slice(0, 2000) } }] },
        ...(data.entitaId && { "Entità ID": { rich_text: [{ text: { content: data.entitaId } }] } }),
        "Eseguita Da": { rich_text: [{ text: { content: data.eseguitaDa } }] },
        Data: { date: { start: new Date().toISOString() } },
        ...(data.dettagli && { Dettagli: { rich_text: [{ text: { content: data.dettagli.slice(0, 2000) } }] } }),
      },
    });
  } catch {
    // Fire-and-forget: never block on audit errors
  }
}

function mapAuditLog(page: any) {
  return {
    id: page.id,
    createdTime: page.created_time,
    titolo: richText(page, "Titolo"),
    azione: selectVal(page, "Azione"),
    entita: selectVal(page, "Entità"),
    nomeEntita: richText(page, "Nome Entità"),
    entitaId: richText(page, "Entità ID"),
    eseguitaDa: richText(page, "Eseguita Da"),
    data: dateVal(page, "Data"),
    dettagli: richText(page, "Dettagli"),
  };
}

export async function getAuditLogs(limit = 100) {
  const response = await notion.databases.query({
    database_id: AUDIT_DB,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: limit,
  });
  return response.results.map(mapAuditLog);
}

export async function getLeadActivities(leadId: string): Promise<Array<{ date: string; text: string; author: string }>> {
  try {
    const blocks = await notion.blocks.children.list({ block_id: leadId, page_size: 100 });
    const activities: Array<{ date: string; text: string; author: string }> = [];
    for (const block of blocks.results as any[]) {
      if (block.type !== "paragraph") continue;
      const text = block.paragraph.rich_text?.[0]?.plain_text ?? "";
      // Format: "DATETIME||AUTHOR||TEXT"
      const parts = text.split("||");
      if (parts.length === 3) {
        activities.push({ date: parts[0], author: parts[1], text: parts[2] });
      }
    }
    return activities.reverse(); // newest first
  } catch {
    return [];
  }
}

export async function addLeadActivity(leadId: string, text: string, author: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const content = `${timestamp}||${author}||${text}`;
  await notion.blocks.children.append({
    block_id: leadId,
    children: [{
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }] },
    }],
  });
}

export async function getLeadsWithFollowupDue() {
  const today = new Date().toISOString().split("T")[0];
  try {
    const response = await notion.databases.query({
      database_id: PIPELINE_DB,
      filter: { property: "Data follow-up", date: { on_or_before: today } },
    });
    return response.results
      .map(mapLead)
      .filter(l => l.stato !== "Acquisito" && l.stato !== "Non interessato");
  } catch {
    return [];
  }
}

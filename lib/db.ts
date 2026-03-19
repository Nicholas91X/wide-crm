import { supabase } from "./supabase";

export interface Lead {
  id: string;
  createdTime: string;
  lastEdited: string;
  nomeAzienda: string;
  settore: string;
  territorio: string;
  sitoWeb: string;
  profiloSocial: string;
  profiloSocial2: string;
  profiloSocial3: string;
  profiloInstagram: string;
  profiloFacebook: string;
  profiloLinkedIn: string;
  profiloTikTok: string;
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
  inseritoDA: string;
}

export interface Report {
  id: string;
  createdTime: string;
  titolo: string;
  azienda: string;
  settore: string;
  leadId: string;
  token: string;
  stato: string;
  esito: string;
  dataGenerazione: string;
  urlPagina: string;
  generatoDa: string;
  contenuto: unknown;
}

export interface Client {
  id: string;
  createdTime: string;
  nome: string;
  settore: string;
  valoreNetto: number;
  dataInizio: string;
  prossimoRinnovo: string;
  statoContratto: string;
  responsabile: string;
  note: string;
  sitoWeb: string;
}

export interface SearchLog {
  id: string;
  createdTime: string;
  titolo: string;
  settore: string;
  territorio: string;
  tipoAttivita: string;
  criteriAggiuntivi: string;
  numRichiesti: number;
  numTrovati: number;
  numAggiunti: number;
  effettuataDa: string;
  dataRicerca: string;
  metodo: string;
  leadsJson: unknown[];
}

export interface Event {
  id: string;
  createdTime: string;
  titolo: string;
  inizio: string;
  fine: string;
  membro: string;
  collaboratori?: string;
  leadId: string;
  tipo: string;
  note: string;
}

export type AuditAzione =
  | "Accesso"
  | "Ricerca"
  | "Creazione"
  | "Modifica"
  | "Eliminazione"
  | "Generazione Report"
  | "Invio Report"
  | "Download";

export type AuditEntita = "Sistema" | "Lead" | "Report" | "Cliente" | "Evento" | "Ricerca";

export interface AuditEntry {
  id: string;
  created_at: string;
  azione: AuditAzione;
  entita: AuditEntita;
  nome_entita: string;
  entita_id?: string;
  eseguita_da: string;
  dettagli?: string;
}

// ─── Mapping Helpers ─────────────────────────────────────────────────────────

function mapLeadFromSupabase(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    createdTime: row.created_at as string,
    lastEdited: row.last_edited_at as string,
    nomeAzienda: (row.nome_azienda as string) || "",
    settore: (row.settore as string) || "",
    territorio: (row.territorio as string) || "",
    sitoWeb: (row.sito_web as string) || "",
    profiloSocial: (row.profilo_social as string) || "",
    profiloSocial2: (row.profilo_social_2 as string) || "",
    profiloSocial3: (row.profilo_social_3 as string) || "",
    profiloInstagram: (row.profilo_instagram as string) || "",
    profiloFacebook: (row.profilo_facebook as string) || "",
    profiloLinkedIn: (row.profilo_linkedin as string) || "",
    profiloTikTok: (row.profilo_tiktok as string) || "",
    canale: (row.canale as string) || "",
    note: (row.note as string) || "",
    score: (row.score as string) || "",
    stato: (row.stato as string) || "",
    dataCreazioneReport: (row.data_creazione_report as string) || "",
    dataPrimoContatto: (row.data_primo_contatto as string) || "",
    dataSecondoContatto: (row.data_secondo_contatto as string) || "",
    dataFollowUp: (row.data_follow_up as string) || "",
    risposta: (row.risposta as string) || "",
    urlReport: (row.url_report as string) || "",
    inseritoDA: (row.inserito_da as string) || "",
  };
}

function mapReportFromSupabase(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    createdTime: row.created_at as string,
    titolo: (row.titolo as string) || "",
    azienda: (row.azienda as string) || "",
    settore: (row.settore as string) || "",
    leadId: (row.lead_id as string) || "",
    token: (row.token as string) || "",
    stato: (row.stato as string) || "",
    esito: (row.esito as string) || "",
    dataGenerazione: (row.data_generazione as string) || "",
    urlPagina: (row.url_pagina as string) || "",
    generatoDa: (row.generato_da as string) || "",
    contenuto: row.contenuto || null,
  };
}

function mapClientFromSupabase(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    createdTime: row.created_at as string,
    nome: (row.nome as string) || "",
    settore: (row.settore as string) || "",
    valoreNetto: (row.valore_netto as number) || 0,
    dataInizio: (row.data_inizio as string) || "",
    prossimoRinnovo: (row.prossimo_rinnovo as string) || "",
    statoContratto: (row.stato_contratto as string) || "",
    responsabile: (row.responsabile as string) || "",
    note: (row.note as string) || "",
    sitoWeb: (row.sito_web as string) || "",
  };
}

function mapSearchLogFromSupabase(row: Record<string, unknown>): SearchLog {
  return {
    id: row.id as string,
    createdTime: row.created_at as string,
    titolo: (row.titolo as string) || "",
    settore: (row.settore as string) || "",
    territorio: (row.territorio as string) || "",
    tipoAttivita: (row.tipo_attivita as string) || "",
    criteriAggiuntivi: (row.criteri_aggiuntivi as string) || "",
    numRichiesti: (row.num_richiesti as number) || 0,
    numTrovati: (row.num_trovati as number) || 0,
    numAggiunti: (row.num_aggiunti as number) || 0,
    effettuataDa: (row.effettuata_da as string) || "",
    dataRicerca: (row.data_ricerca as string) || "",
    metodo: (row.metodo as string) || "",
    leadsJson: (row.leads_json as unknown[]) || [],
  };
}

function mapEventFromSupabase(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    createdTime: row.created_at as string,
    titolo: (row.titolo as string) || "",
    inizio: (row.inizio as string) || "",
    fine: (row.fine as string) || "",
    membro: (row.membro as string) || "",
    collaboratori: (row.collaboratori as string) || "",
    leadId: (row.lead_id as string) || "",
    tipo: (row.tipo as string) || "",
    note: (row.note as string) || "",
  };
}

// ─── Service Methods ─────────────────────────────────────────────────────────

// LEADS
export async function getLeads(filters?: {
  settore?: string;
  stato?: string;
  territorio?: string;
  score?: string;
}): Promise<Lead[]> {
  let query = supabase.from("leads").select("*");

  if (filters) {
    if (filters.settore) query = query.eq("settore", filters.settore);
    if (filters.stato) query = query.eq("stato", filters.stato);
    if (filters.territorio) query = query.ilike("territorio", `%${filters.territorio}%`);
    if (filters.score) query = query.eq("score", filters.score);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLeadFromSupabase);
}

export async function getLeadsWithFollowupDue(): Promise<Lead[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .lte("data_follow_up", today)
    .neq("stato", "chiuso")
    .order("data_follow_up", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapLeadFromSupabase);
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return mapLeadFromSupabase(data);
}

export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert([{
      nome_azienda: lead.nomeAzienda,
      settore: lead.settore,
      territorio: lead.territorio,
      sito_web: lead.sitoWeb,
      profilo_social: lead.profiloSocial,
      profilo_social_2: lead.profiloSocial2,
      profilo_social_3: lead.profiloSocial3,
      profilo_instagram: lead.profiloInstagram,
      profilo_facebook: lead.profiloFacebook,
      profilo_linkedin: lead.profiloLinkedIn,
      profilo_tiktok: lead.profiloTikTok,
      canale: lead.canale,
      note: lead.note,
      score: lead.score,
      stato: lead.stato || "da contattare",
      data_creazione_report: lead.dataCreazioneReport,
      data_primo_contatto: lead.dataPrimoContatto,
      data_secondo_contatto: lead.dataSecondoContatto,
      data_follow_up: lead.dataFollowUp,
      risposta: lead.risposta,
      url_report: lead.urlReport,
      inserito_da: lead.inseritoDA,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapLeadFromSupabase(data);
}

export async function createLeads(leads: Partial<Lead>[]): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .insert(leads.map(l => ({
      nome_azienda: l.nomeAzienda,
      settore: l.settore,
      territorio: l.territorio,
      sito_web: l.sitoWeb,
      profilo_social: l.profiloSocial,
      profilo_social_2: l.profiloSocial2,
      profilo_social_3: l.profiloSocial3,
      profilo_instagram: l.profiloInstagram,
      profilo_facebook: l.profiloFacebook,
      profilo_linkedin: l.profiloLinkedIn,
      profilo_tiktok: l.profiloTikTok,
      canale: l.canale,
      note: l.note,
      inserito_da: l.inseritoDA,
      stato: "da contattare",
    })))
    .select();
  if (error) throw error;
  return (data || []).map(mapLeadFromSupabase);
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const mappedUpdates: Record<string, unknown> = {};
  if (updates.nomeAzienda !== undefined) mappedUpdates.nome_azienda = updates.nomeAzienda;
  if (updates.settore !== undefined) mappedUpdates.settore = updates.settore;
  if (updates.territorio !== undefined) mappedUpdates.territorio = updates.territorio;
  if (updates.sitoWeb !== undefined) mappedUpdates.sito_web = updates.sitoWeb;
  if (updates.profiloSocial !== undefined) mappedUpdates.profilo_social = updates.profiloSocial;
  if (updates.profiloSocial2 !== undefined) mappedUpdates.profilo_social_2 = updates.profiloSocial2;
  if (updates.profiloSocial3 !== undefined) mappedUpdates.profilo_social_3 = updates.profiloSocial3;
  if (updates.profiloInstagram !== undefined) mappedUpdates.profilo_instagram = updates.profiloInstagram;
  if (updates.profiloFacebook !== undefined) mappedUpdates.profilo_facebook = updates.profiloFacebook;
  if (updates.profiloLinkedIn !== undefined) mappedUpdates.profilo_linkedin = updates.profiloLinkedIn;
  if (updates.profiloTikTok !== undefined) mappedUpdates.profilo_tiktok = updates.profiloTikTok;
  if (updates.canale !== undefined) mappedUpdates.canale = updates.canale;
  if (updates.note !== undefined) mappedUpdates.note = updates.note;
  if (updates.score !== undefined) mappedUpdates.score = updates.score;
  if (updates.stato !== undefined) mappedUpdates.stato = updates.stato;
  if (updates.dataCreazioneReport !== undefined) mappedUpdates.data_creazione_report = updates.dataCreazioneReport;
  if (updates.dataPrimoContatto !== undefined) mappedUpdates.data_primo_contatto = updates.dataPrimoContatto;
  if (updates.dataSecondoContatto !== undefined) mappedUpdates.data_secondo_contatto = updates.dataSecondoContatto;
  if (updates.dataFollowUp !== undefined) mappedUpdates.data_follow_up = updates.dataFollowUp;
  if (updates.risposta !== undefined) mappedUpdates.risposta = updates.risposta;
  if (updates.urlReport !== undefined) mappedUpdates.url_report = updates.urlReport;
  if (updates.inseritoDA !== undefined) mappedUpdates.inserito_da = updates.inseritoDA;
  
  mappedUpdates.last_edited_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("leads")
    .update(mappedUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapLeadFromSupabase(data);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

// REPORTS
export async function getReports(filters?: {
  stato?: string;
  esito?: string;
  settore?: string;
  leadId?: string;
}): Promise<Report[]> {
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.stato) query = query.eq("stato", filters.stato);
  if (filters?.esito) query = query.eq("esito", filters.esito);
  if (filters?.settore) query = query.eq("settore", filters.settore);
  if (filters?.leadId) query = query.eq("lead_id", filters.leadId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapReportFromSupabase);
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return mapReportFromSupabase(data);
}

export async function getReportByToken(token: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("token", token)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return mapReportFromSupabase(data);
}

export async function createReport(report: Partial<Report>): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .insert([{
      titolo: report.titolo,
      azienda: report.azienda,
      settore: report.settore,
      lead_id: report.leadId,
      token: report.token,
      stato: report.stato || "Bozza",
      esito: report.esito || "In attesa",
      data_generazione: report.dataGenerazione,
      url_pagina: report.urlPagina,
      generato_da: report.generatoDa,
      contenuto: report.contenuto,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapReportFromSupabase(data);
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<Report> {
  const mappedUpdates: Record<string, unknown> = {};
  if (updates.titolo !== undefined) mappedUpdates.titolo = updates.titolo;
  if (updates.azienda !== undefined) mappedUpdates.azienda = updates.azienda;
  if (updates.settore !== undefined) mappedUpdates.settore = updates.settore;
  if (updates.leadId !== undefined) mappedUpdates.lead_id = updates.leadId;
  if (updates.token !== undefined) mappedUpdates.token = updates.token;
  if (updates.stato !== undefined) mappedUpdates.stato = updates.stato;
  if (updates.esito !== undefined) mappedUpdates.esito = updates.esito;
  if (updates.dataGenerazione !== undefined) mappedUpdates.data_generazione = updates.dataGenerazione;
  if (updates.urlPagina !== undefined) mappedUpdates.url_pagina = updates.urlPagina;
  if (updates.generatoDa !== undefined) mappedUpdates.generato_da = updates.generatoDa;
  if (updates.contenuto !== undefined) mappedUpdates.contenuto = updates.contenuto;

  const { data, error } = await supabase
    .from("reports")
    .update(mappedUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapReportFromSupabase(data);
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}

// CLIENTS
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapClientFromSupabase);
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return mapClientFromSupabase(data);
}

export async function createClient(client: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert([{
      nome: client.nome,
      settore: client.settore,
      valore_netto: client.valoreNetto,
      data_inizio: client.dataInizio,
      prossimo_rinnovo: client.prossimoRinnovo,
      stato_contratto: client.statoContratto,
      responsabile: client.responsabile,
      note: client.note,
      sito_web: client.sitoWeb,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapClientFromSupabase(data);
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const mappedUpdates: Record<string, unknown> = {};
  if (updates.nome !== undefined) mappedUpdates.nome = updates.nome;
  if (updates.settore !== undefined) mappedUpdates.settore = updates.settore;
  if (updates.valoreNetto !== undefined) mappedUpdates.valore_netto = updates.valoreNetto;
  if (updates.dataInizio !== undefined) mappedUpdates.data_inizio = updates.dataInizio;
  if (updates.prossimoRinnovo !== undefined) mappedUpdates.prossimo_rinnovo = updates.prossimoRinnovo;
  if (updates.statoContratto !== undefined) mappedUpdates.stato_contratto = updates.statoContratto;
  if (updates.responsabile !== undefined) mappedUpdates.responsabile = updates.responsabile;
  if (updates.note !== undefined) mappedUpdates.note = updates.note;
  if (updates.sitoWeb !== undefined) mappedUpdates.sito_web = updates.sitoWeb;

  const { data, error } = await supabase
    .from("clients")
    .update(mappedUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapClientFromSupabase(data);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// SEARCH LOGS
export async function getSearchLogs(): Promise<SearchLog[]> {
  const { data, error } = await supabase
    .from("search_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSearchLogFromSupabase);
}

export async function createSearchLog(log: Partial<SearchLog>): Promise<SearchLog> {
  const { data, error } = await supabase
    .from("search_logs")
    .insert([{
      titolo: log.titolo,
      settore: log.settore,
      territorio: log.territorio,
      tipo_attivita: log.tipoAttivita,
      criteri_aggiuntivi: log.criteriAggiuntivi,
      num_richiesti: log.numRichiesti,
      num_trovati: log.numTrovati,
      num_aggiunti: log.numAggiunti,
      effettuata_da: log.effettuataDa,
      data_ricerca: log.dataRicerca,
      metodo: log.metodo,
      leads_json: log.leadsJson,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapSearchLogFromSupabase(data);
}

// EVENTS
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("inizio", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapEventFromSupabase);
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return mapEventFromSupabase(data);
}

export async function createEvent(event: Partial<Event>): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .insert([{
      titolo: event.titolo,
      inizio: event.inizio,
      fine: event.fine,
      membro: event.membro,
      collaboratori: event.collaboratori,
      lead_id: event.leadId,
      tipo: event.tipo,
      note: event.note,
    }])
    .select()
    .single();
  if (error) throw error;
  return mapEventFromSupabase(data);
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
  const mappedUpdates: Record<string, unknown> = {};
  if (updates.titolo !== undefined) mappedUpdates.titolo = updates.titolo;
  if (updates.inizio !== undefined) mappedUpdates.inizio = updates.inizio;
  if (updates.fine !== undefined) mappedUpdates.fine = updates.fine;
  if (updates.membro !== undefined) mappedUpdates.membro = updates.membro;
  if (updates.collaboratori !== undefined) mappedUpdates.collaboratori = updates.collaboratori;
  if (updates.leadId !== undefined) mappedUpdates.lead_id = updates.leadId;
  if (updates.tipo !== undefined) mappedUpdates.tipo = updates.tipo;
  if (updates.note !== undefined) mappedUpdates.note = updates.note;

  const { data, error } = await supabase
    .from("events")
    .update(mappedUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapEventFromSupabase(data);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

// AUDIT
export async function logAction(data: {
  azione: AuditAzione;
  entita: AuditEntita;
  nomeEntita: string;
  entitaId?: string;
  eseguitaDa: string;
  dettagli?: string;
}) {
  try {
    await supabase.from("audit_log").insert([{
      azione: data.azione,
      entita: data.entita,
      nome_entita: data.nomeEntita,
      entita_id: data.entitaId,
      eseguita_da: data.eseguitaDa,
      dettagli: data.dettagli,
    }]);
  } catch {
    // Fire-and-forget
  }
}

export async function getAuditLogs(limit: number = 100): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapAuditEntryFromSupabase);
}

function mapAuditEntryFromSupabase(row: Record<string, unknown>): AuditEntry {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    azione: row.azione as AuditAzione,
    entita: row.entita as AuditEntita,
    nome_entita: (row.nome_entita as string) || "",
    entita_id: (row.entita_id as string) || undefined,
    eseguita_da: (row.eseguita_da as string) || "",
    dettagli: row.dettagli as string | undefined,
  };
}

// LEAD ACTIVITIES
export async function getLeadActivities(leadId: string) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addLeadActivity(leadId: string, author: string, content: string) {
  const { data, error } = await supabase
    .from("lead_activities")
    .insert([{
      lead_id: leadId,
      author,
      content,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

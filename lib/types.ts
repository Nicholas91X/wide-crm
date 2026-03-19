export type Role = "admin" | "editor" | "viewer";

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
  score: string; // "🔴 Basso" | "🟡 Medio" | "🟢 Alto"
  stato: string;
  dataCreazioneReport: string;
  dataPrimoContatto: string;
  dataSecondoContatto: string;
  dataFollowUp: string;
  risposta: string; // select: "In attesa" | "Positiva" | "Negativa" | "Silenzio"
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
  contenuto: string;
  generatoDa: string;
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

export const STATI_LEAD = [
  "Da contattare",
  "Contattato",
  "Report in lavorazione",
  "Report completato",
  "Report inviato",
  "Follow-up",
  "Acquisito",
  "Non interessato",
] as const;

export const SCORE_OPTIONS = [
  "🔴 Basso",
  "🟡 Medio",
  "🟢 Alto",
] as const;

export const RISPOSTA_OPTIONS = [
  "In attesa",
  "Positiva",
  "Negativa",
  "Silenzio",
] as const;

export const SETTORI = [
  "Automotive",
  "Ristorazione",
  "Retail",
  "Professionale",
  "Immobiliare",
  "Benessere",
  "Altro",
] as const;

// Opzioni canale allineate al database Notion reale
export const CANALI = [
  "Di persona",
  "LinkedIn",
  "Email",
  "Telefono",
  "Social Media",
  "Networking",
] as const;

export const STATI_REPORT = ["Bozza", "Pronto", "Inviato", "Visto", "Archiviato"] as const;

export const ESITI_REPORT = [
  "In attesa",
  "Interesse manifestato",
  "Call prenotata",
  "Acquisito",
  "Nessuna risposta",
  "Rifiutato",
] as const;

export const STATI_CONTRATTO = ["Attivo", "In scadenza", "Sospeso", "Chiuso"] as const;

export type SearchMetodo = "Tavily" | "Web Search" | "Conoscenza Base";

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
  metodo: SearchMetodo | string;
  leads: DiscoveredLeadSnapshot[];
}

export interface DiscoveredLeadSnapshot {
  nomeAzienda: string;
  settore: string;
  territorio: string;
  sitoWeb: string;
  profiloSocial: string;
  profiloTikTok: string;
  note: string;
  aggiunto: boolean;
}

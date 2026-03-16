# WIDE CRM

CRM per gestione pipeline commerciale e analisi digitale con AI.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js (Google OAuth)
- Notion API
- Anthropic API (claude-sonnet-4-6 + web_search)
- shadcn/ui (Radix UI)

## Prerequisiti

- Node.js 18+
- Account Google Cloud (per OAuth)
- Workspace Notion con 3 database configurati
- API Key Anthropic

## Setup .env.local

Crea `.env.local` nella root del progetto:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
NOTION_TOKEN=secret_xxx
NOTION_PIPELINE_DB_ID=ed25081d2eba4dd1a95a23f544acbba0
NOTION_REPORTS_DB_ID=eee8b8cef3e2492cb4d4c4ce6bd69487
NOTION_CLIENTS_DB_ID=58b70a96108748ab963faccceee6085d
ALLOWED_USERS=[{"email":"admin@gmail.com","role":"admin"},{"email":"editor@gmail.com","role":"editor"}]
CALENDLY_URL=https://calendly.com/tuo-link
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/tuo-link
```

## Configurazione Google OAuth

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o selezionane uno esistente
3. Abilita "Google+ API" o "Google People API"
4. Vai su **Credenziali** → **Crea credenziali** → **ID client OAuth 2.0**
5. Tipo applicazione: **Applicazione web**
6. URI di reindirizzamento autorizzati:
   - `http://localhost:3000/api/auth/callback/google` (sviluppo)
   - `https://tuo-dominio.vercel.app/api/auth/callback/google` (produzione)
7. Copia Client ID e Client Secret nel `.env.local`

## Database Notion

Ogni database Notion deve avere queste proprietà:

### Pipeline Lead
| Proprietà | Tipo |
|-----------|------|
| Nome Azienda | Titolo |
| Settore | Select |
| Territorio | Rich Text |
| Sito Web | URL |
| Profilo Social | URL |
| Canale primo contatto | Select |
| Note | Rich Text |
| Score Qualificazione | Number |
| Stato | Select |
| Data primo contatto | Date |
| Data follow-up | Date |
| Risposta | Rich Text |
| URL Report | URL |

### Report Generati
| Proprietà | Tipo |
|-----------|------|
| Titolo | Titolo |
| Azienda | Rich Text |
| Settore | Select |
| Lead ID | Rich Text |
| Contenuto | Rich Text |
| Stato | Select |
| Esito | Select |
| Token | Rich Text |
| Data generazione | Date |

### Clienti Attivi
| Proprietà | Tipo |
|-----------|------|
| Nome | Titolo |
| Settore | Select |
| Valore mensile | Number |
| Data inizio | Date |
| Prossimo rinnovo | Date |
| Stato contratto | Select |
| Responsabile | Rich Text |

Per ogni database, condividilo con l'integrazione Notion (Settings → Connections).

## Avvio locale

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Deploy su Vercel

1. Pusha il codice su GitHub
2. Vai su [vercel.com](https://vercel.com) → **New Project** → importa il repo
3. Aggiungi tutte le variabili d'ambiente dal `.env.local`
4. Aggiorna `NEXTAUTH_URL` con il dominio Vercel
5. Aggiorna gli URI di reindirizzamento OAuth in Google Cloud Console
6. Deploy

## RBAC (Ruoli)

- **admin**: accesso completo incluse Impostazioni
- **editor**: può creare lead e generare report, no Impostazioni
- **viewer**: sola lettura

I ruoli si configurano tramite `ALLOWED_USERS` nell'env.

## Report pubblici

I report generati hanno un link pubblico condivisibile con token:
```
https://tuo-dominio.com/r/[report-id]?token=[token]
```
Il token è generato come `SHA256(leadId + NEXTAUTH_SECRET).slice(0,16)`.

# Chat with your documents (RAG)

A full-stack retrieval-augmented generation app: upload a PDF or text file, then
ask questions answered **only** from your documents, with source citations.

## Stack

- **Next.js (App Router) + TypeScript** — full-stack framework
- **Tailwind CSS** — styling
- **Supabase Postgres + pgvector** — vector store
- **Voyage AI** (`voyage-3.5`) — embeddings
- **Anthropic Claude** — answer generation (streamed)

## Features

- Upload PDF / text files, chunked and embedded into a vector store
- Streamed, grounded answers with inline `[source.pdf]` citations
- Expandable **"sources used"** panel under each answer (filename, % match, snippet)
- **Document management** — list indexed files with chunk counts and delete them

## How it works

```
Upload → extract text → chunk → embed (Voyage) → store vectors (Supabase)
Ask    → embed query → vector similarity search → top-k chunks → Claude → stream answer
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This enables
   pgvector and creates the `documents` table + `match_documents` function.

### 3. Get your API keys

| Key | Where | Free? |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Free trial credits |
| `VOYAGE_API_KEY` | [voyageai.com](https://www.voyageai.com) → Dashboard → API Keys | 200M tokens free |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Free tier |

### 4. Configure environment

```bash
cp .env.local.example .env.local
# then fill in your keys
```

> Running low on Anthropic credits? Add `CHAT_MODEL=claude-haiku-4-5` to
> `.env.local` to switch to the cheapest model.

### 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, upload a document, and start asking questions.

> Already ran `schema.sql` from an earlier version? Re-run it — it now also
> creates the `list_documents()` function used by the document-management UI.
> Re-running is safe (everything uses `create or replace` / `if not exists`).

## Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo (Vercel
   auto-detects Next.js — no config needed).
3. Under **Environment Variables**, add the same four keys from your
   `.env.local`:
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (optional) `CHAT_MODEL`
4. Click **Deploy**. Your live URL is ready in ~1 minute — drop it on your resume.

Your Supabase database is already cloud-hosted, so no extra DB setup is needed
for production.

## Project layout

```
src/
  app/
    page.tsx              # UI shell
    layout.tsx
    api/
      upload/route.ts     # extract → chunk → embed → store
      chat/route.ts       # retrieve → stream Claude's answer
  components/
    Chat.tsx              # upload + streaming chat UI
  lib/
    anthropic.ts          # Claude client + model selection
    voyage.ts             # embeddings
    supabase.ts           # vector store client
    chunk.ts              # text chunking
supabase/
  schema.sql              # pgvector table + match_documents()
```

## Notes & next steps

- Embeddings are `voyage-3.5` (1024-dim). If you change the model, update the
  `vector(1024)` dimension in `schema.sql` to match.
- Ideas to extend: per-user document isolation (filter by `metadata`),
  conversation history, a "sources used" panel, delete/manage documents.

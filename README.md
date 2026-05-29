<div align="center">

# Sourced

### Chat with your documents — grounded, cited answers powered by RAG

Upload PDFs or text files and ask questions in natural language. Every answer is
generated **only** from your documents and comes with verifiable source citations —
no hallucinations, no guessing.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-Google-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)

[**Live demo**](https://your-deployment.vercel.app) · [Features](#features) · [Architecture](#architecture) · [How it works](#how-it-works) · [Getting started](#getting-started)

</div>

---

## Overview

**Sourced** is a full-stack retrieval-augmented generation (RAG) application. Rather
than relying on a language model's memorized knowledge, it retrieves the most
relevant passages from *your* uploaded documents and uses them as the sole context
for each answer — the pattern behind modern "chat with your data" products.

It demonstrates an end-to-end RAG pipeline: document ingestion, text chunking,
vector embeddings, similarity search, and streaming LLM generation with citations.

## Features

| | |
| --- | --- |
| **Document ingestion** | Upload PDF, TXT, or Markdown files; text is extracted, chunked, embedded, and stored as vectors |
| **Grounded answers** | Responses are generated only from retrieved context — the model is instructed to say "I don't know" rather than hallucinate |
| **Inline citations** | Answers cite source filenames; an expandable panel shows each retrieved chunk with its similarity score |
| **Streaming responses** | Tokens stream to the UI in real time over a newline-delimited JSON protocol |
| **Knowledge-base management** | List indexed documents with chunk counts and remove them in one click |
| **Production-ready** | Lazy-initialized clients, batched embeddings, and typed end-to-end |

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["Next.js UI<br/>(React + Tailwind)"]
    end

    subgraph Server["Next.js API Routes"]
        UP["/api/upload"]
        CH["/api/chat"]
        DOC["/api/documents"]
    end

    subgraph External["External services"]
        EMB["Google<br/>(embeddings)"]
        DB[("Supabase<br/>Postgres + pgvector")]
        LLM["Google Gemini<br/>(generation)"]
    end

    UI -- "upload file" --> UP
    UI -- "ask question" --> CH
    UI -- "list / delete" --> DOC

    UP -- "embed chunks" --> EMB
    UP -- "store vectors" --> DB

    CH -- "embed query" --> EMB
    CH -- "similarity search" --> DB
    CH -- "context + question" --> LLM
    LLM -- "streamed answer" --> UI

    DOC <--> DB
```

## How it works

The core RAG algorithm runs in two phases — **indexing** (on upload) and
**retrieval + generation** (on each question).

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Browser
    participant API as API Route
    participant Embed as Google Embeddings
    participant DB as pgvector
    participant Gemini

    rect rgb(245, 245, 245)
    note over User,DB: Indexing (once per document)
    User->>UI: Upload document
    UI->>API: POST /api/upload
    API->>API: Extract text + chunk (1k chars, 200 overlap)
    API->>Embed: Embed chunks (gemini-embedding-001)
    Embed-->>API: 768-dim vectors
    API->>DB: Insert {content, embedding, source}
    end

    rect rgb(245, 245, 245)
    note over User,Gemini: Retrieval + generation (per question)
    User->>UI: Ask a question
    UI->>API: POST /api/chat
    API->>Embed: Embed query
    Embed-->>API: Query vector
    API->>DB: match_documents() — cosine top-k
    DB-->>API: Most relevant chunks
    API->>Gemini: System prompt + context + question
    Gemini-->>UI: Stream answer (+ sources)
    end
```

**Why each piece:**

- **Chunking with overlap** keeps passages that straddle a boundary retrievable.
- **Google embeddings** map text to a 768-dim vector space where semantic
  similarity ≈ geometric closeness, so the most relevant chunks can be found by
  nearest-neighbour search.
- **pgvector cosine search** (`match_documents`) returns the top-k nearest chunks.
- **Gemini** generates the final answer constrained to that retrieved context.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS, Geist typeface |
| Vector store | Supabase (Postgres + `pgvector`) |
| Embeddings | Google `gemini-embedding-001` (768-dim) |
| Generation | Google Gemini (streamed) |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project and a
  [Google AI Studio](https://aistudio.google.com/apikey) API key (generous free
  tiers on both — no credit card required)

### 1. Install

```bash
git clone https://github.com/prem-maradiya/ai-chatbot-for-document.git
cd ai-chatbot-for-document
npm install
```

### 2. Set up the database

In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This enables `pgvector`
and creates the `documents` table plus the `match_documents` and `list_documents`
functions.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `GOOGLE_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `CHAT_MODEL` *(optional)* | Defaults to `gemini-2.5-flash`; set `gemini-2.5-flash-lite` for lower cost/latency |

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, upload a document, and start asking questions.

## Deployment

Deployed on [Vercel](https://vercel.com) — push to GitHub, import the repo
(Next.js is auto-detected), add the environment variables above, and deploy. The
Supabase database is already cloud-hosted, so no additional production setup is
required.

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                # Renders the workspace
│  ├─ layout.tsx              # Fonts + metadata
│  └─ api/
│     ├─ upload/route.ts      # extract → chunk → embed → store
│     ├─ chat/route.ts        # retrieve → stream Gemini (NDJSON)
│     └─ documents/route.ts   # list + delete indexed documents
├─ components/
│  ├─ Workspace.tsx           # App shell + state coordination
│  ├─ Uploader.tsx            # Drag-and-drop upload
│  ├─ Documents.tsx           # Knowledge-base list / delete
│  └─ Chat.tsx                # Streaming chat + source citations
└─ lib/
   ├─ gemini.ts               # Google client — embeddings + generation
   ├─ supabase.ts             # Vector store client
   └─ chunk.ts                # Text chunking
supabase/
└─ schema.sql                 # pgvector table + RPC functions
```

## License

MIT

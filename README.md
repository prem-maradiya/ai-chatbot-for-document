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
[![Anthropic](https://img.shields.io/badge/Claude-Anthropic-D97757?style=flat-square&logo=anthropic&logoColor=white)](https://www.anthropic.com/)

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
| **Production-ready** | Lazy-initialized clients, batched embeddings, prompt caching, and typed end-to-end |

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
        VOY["Voyage AI<br/>(embeddings)"]
        DB[("Supabase<br/>Postgres + pgvector")]
        LLM["Anthropic Claude<br/>(generation)"]
    end

    UI -- "upload file" --> UP
    UI -- "ask question" --> CH
    UI -- "list / delete" --> DOC

    UP -- "embed chunks" --> VOY
    UP -- "store vectors" --> DB

    CH -- "embed query" --> VOY
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
    participant Voyage
    participant DB as pgvector
    participant Claude

    rect rgb(245, 245, 245)
    note over User,DB: Indexing (once per document)
    User->>UI: Upload document
    UI->>API: POST /api/upload
    API->>API: Extract text + chunk (1k chars, 200 overlap)
    API->>Voyage: Embed chunks (voyage-3.5)
    Voyage-->>API: 1024-dim vectors
    API->>DB: Insert {content, embedding, source}
    end

    rect rgb(245, 245, 245)
    note over User,Claude: Retrieval + generation (per question)
    User->>UI: Ask a question
    UI->>API: POST /api/chat
    API->>Voyage: Embed query
    Voyage-->>API: Query vector
    API->>DB: match_documents() — cosine top-k
    DB-->>API: Most relevant chunks
    API->>Claude: System prompt + context + question
    Claude-->>UI: Stream answer (+ sources)
    end
```

**Why each piece:**

- **Chunking with overlap** keeps passages that straddle a boundary retrievable.
- **Voyage embeddings** map text to a 1024-dim vector space where semantic
  similarity ≈ geometric closeness. (Claude itself doesn't produce embeddings, so a
  dedicated embeddings model is used for the retrieval half.)
- **pgvector cosine search** (`match_documents`) returns the top-k nearest chunks.
- **Claude** generates the final answer constrained to that retrieved context.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS, Geist typeface |
| Vector store | Supabase (Postgres + `pgvector`) |
| Embeddings | Voyage AI (`voyage-3.5`, 1024-dim) |
| Generation | Anthropic Claude (streamed) |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project, an
  [Anthropic API key](https://console.anthropic.com), and a
  [Voyage AI API key](https://www.voyageai.com) (generous free tiers on all three)

### 1. Install

```bash
git clone https://github.com/prem-maradiya/ai-document-chat.git
cd ai-document-chat
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
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `VOYAGE_API_KEY` | [voyageai.com](https://www.voyageai.com) → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `CHAT_MODEL` *(optional)* | Defaults to `claude-opus-4-8`; set `claude-haiku-4-5` to use the cheapest model |

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, upload a document, and start asking questions.

## Deployment

Deployed on [Vercel](https://vercel.com) — push to GitHub, import the repo
(Next.js is auto-detected), add the four environment variables above, and deploy.
The Supabase database is already cloud-hosted, so no additional production setup is
required.

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                # Renders the workspace
│  ├─ layout.tsx              # Fonts + metadata
│  └─ api/
│     ├─ upload/route.ts      # extract → chunk → embed → store
│     ├─ chat/route.ts        # retrieve → stream Claude (NDJSON)
│     └─ documents/route.ts   # list + delete indexed documents
├─ components/
│  ├─ Workspace.tsx           # App shell + state coordination
│  ├─ Uploader.tsx            # Drag-and-drop upload
│  ├─ Documents.tsx           # Knowledge-base list / delete
│  └─ Chat.tsx                # Streaming chat + source citations
└─ lib/
   ├─ anthropic.ts            # Claude client + model selection
   ├─ voyage.ts               # Embeddings
   ├─ supabase.ts             # Vector store client
   └─ chunk.ts                # Text chunking
supabase/
└─ schema.sql                 # pgvector table + RPC functions
```

## License

MIT

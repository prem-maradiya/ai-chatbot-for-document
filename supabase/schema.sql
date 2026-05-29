-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- It sets up pgvector, a documents table, and a similarity-search function.

-- 1. Enable the pgvector extension
create extension if not exists vector;

-- 2. Table holding each chunk + its embedding.
--    Google text-embedding-004 produces 768-dimensional embeddings.
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector(768)
);

-- 3. Approximate-nearest-neighbour index for fast cosine similarity search.
create index if not exists documents_embedding_idx
  on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. RPC the app uses to list indexed documents (one row per source file).
create or replace function list_documents ()
returns table (source text, chunks bigint)
language sql
as $$
  select metadata->>'source' as source, count(*) as chunks
  from documents
  group by metadata->>'source'
  order by source;
$$;

-- 5. RPC the app calls to retrieve the most relevant chunks for a query.
create or replace function match_documents (
  query_embedding vector(768),
  match_count int default 5,
  filter jsonb default '{}'
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

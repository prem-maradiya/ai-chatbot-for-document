-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- It sets up pgvector, a documents table, and a similarity-search function.

-- 1. Enable the pgvector extension
create extension if not exists vector;

-- 2. Table holding each chunk + its embedding.
--    Google gemini-embedding-001 produces 768-dimensional embeddings.
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector(768)
);

-- 3. No ANN index by default. pgvector does exact nearest-neighbour search,
--    which is fast for small/medium datasets and ALWAYS returns correct results.
--    (Heads-up: an `ivfflat` index created on an EMPTY table can't build its
--    clusters and will return no results — a very common pitfall.)
--    For large datasets, add an HNSW index AFTER loading data:
--      create index on documents using hnsw (embedding vector_cosine_ops);

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

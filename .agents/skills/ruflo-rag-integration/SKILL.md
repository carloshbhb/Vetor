---
name: ruflo-rag-integration
description: >-
  Ruflo Vector RAG Integration - semantic search and retrieval-augmented generation
  pipeline with HNSW indexing, hybrid search, and model migration support.
---

# Ruflo RAG Integration Skill

Purpose: Implement semantic search and retrieval-augmented generation pipeline
following ruflo's vector integration patterns.

## Indexing Pipeline

### Document Preparation

| Step | Description | Tool |
|------|-------------|------|
| Chunking | Split documents into optimal size chunks | `rufflo rag chunk --strategy "semantic"` |
| Embedding | Generate vector embeddings using selected model | `rufflo rag embed --model "nvidia/nv-embed-v1"` |
| Filtering | Remove low-quality or duplicate content | `rufflo rag filter --minScore 0.3` |
| Normalization | Scale vectors for consistent search | `rufflo rag normalize` |

### HNSW Indexing

**Hierarchical Navigable Small World** graph for fast vector search:
- **150x faster** than linear search
- **O(log n)** query complexity
- **Configurable**: `M` (connections per node), `ef` (search width)

**Default Configuration:**
```json
{
  "M": 16,          // connections per HNSW node
  "efConstruction": 40, // index build quality
  "efSearch": 40,   // search quality at query time
  "metric": "cosine" // distance metric
}
```

**Command:**
```bash
npx claude-flow rag index \
  --docs ./knowledge-base \
  --model "nvidia/nv-embed-v1" \
  --hnswConfig "{\"M\": 16, \"efConstruction\": 40}" \
  --collection "project-docs" \
  --metadata "{\"source": "vetor-blog", "version": "1.0"}"
```

## Search Modes

### 1. Dense Vector Search (Semantic)
- Pure semantic meaning matching
- Best for: "find concepts", "similar ideas"
- Weight: 70% of typical search

### 2. Sparse Vector Search (BM25)
- Keyword-based, TF-IDF aware
- Best for: "find specific terms", "exact matches"
- Weight: 30% of typical search

### 3. Hybrid Search (Recommended)
- Combines dense + sparse results
- Reranks using cross-encoder or learner
- Best of both worlds

**Command:**
```bash
npx claude-flow rag search \
  --query "how to optimize Next.js images" \
  --searchMode hybrid \
  --topK 10 \
  --reranker "cross-encoder/ms-marco-MiniLM-L-6-v2" \
  --includeMetadata true
```

### 4. MMR (Maximal Marginal Relevance)
- Diversifies results for variety
- Reduces redundancy
- Good for: "broad topic exploration"

**Command:**
```bash
npx claude-flow rag search \
  --query "machine learning patterns" \
  --strategy MMR \
  --lambda 0.5  // balance relevance vs diversity \
  --topK 15
```

## Reranking

### Cross-Encoder Reranking
- Re-ranks initial search results
- Uses paired input (query + doc) for relevance scoring
- Typically improves precision @ k by 20-30%

**Command:**
```bash
npx claude-flow rag rerank \
  --query "optimize database queries" \
  --resultsFrom "hybrid-search" \
  --reranker "cross-encoder/ms-marco-MiniLM-L-12-v2" \
  --topK 5
```

### Cohere Reranking
- Alternative to cross-encoder
- Higher quality but slower
- Good for critical results

## Model Management

### Supported Embedding Models

| Model | Dimensions | Speed | Quality | Cost |
|-------|-----------|-------|---------|------|
| `nvidia/nv-embed-v1` | 768 | Fast | High | $ |
| `sentence-transformers/all-MiniLM-L6-v2` | 384 | Very Fast | Medium | $ |
| `BAAI/bge-large-en` | 1024 | Slow | Very High | $$ |
| `openai/text-embedding-3-small` | 1536 | Fast | High | $$ |
| `jinaai/jina-embeddings-v2-base-en` | 512 | Fast | High | $$ |

### Model Migration (Zero Downtime)

**Strategy: Parallel Indexing**
```
Current Model (v1)          New Model (v2)
     │                        │
     ├── Index existing data  ├── Index existing data
     │                        │
     ├── Search with v1       ├── Search with v2  
     │                        │
     └── Compare results      └── Validate equivalence
```

**Migration Commands:**
```bash
# Create new index with model v2
npx claude-flow rag index \
  --docs ./knowledge-base \
  --model "nvidia/nv-embed-v2" \
  --collection "project-docs-v2" \
  --migrateFrom "project-docs"

# Run A/B test
npx claude-flow rag search \
  --query "test query" \
  --model "nvidia/nv-embed-v1" \
  --collection "project-docs"

npx claude-flow rag search \
  --query "test query" \
  --model "nvidia/nv-embed-v2" \
  --collection "project-docs-v2"

# Switch production when satisfied
npx claude-flow rag setDefaultModel \
  --model "nvidia/nv-embed-v2" \
  --collection "project-docs-v2"
```

### Model Versioning
- Each index stores embedding model version
- Automatic compatibility checking
- Rollback to previous model if needed
- Version tags: `v1.0`, `v1.1`, `v2.0`, `experimental`

## Persistent Memory Integration

### RAG ↔ Memory Loop

```
User Query → RAG Search → Relevant Context → Agent Response → Lesson Learned → Memory Store → Enhanced Index
     │                                                                                     │
     └─────────────────────────────────────────────────────────────────────────────────────┘
```

**Integration Commands:**
```bash
# Store search results as memories
npx claude-flow memory store \
  --lesson "RAG found these relevant docs for query: {query}" \
  --confidence 0.8 \
  --tags ["rag", "search", "query-{hash}"] \
  --evidence "Search results: {top_doc_ids}"

# Use memories to enhance future searches
npx claude-flow memory search \
  --query "related patterns" \
  --domain "rag-enhanced" \
  --boostRecent true
```

### Cache Layer
- **Result caching**: Store search results with TTL
- **Embedding cache**: Cache generated embeddings
- **Query pattern caching**: Learn common query patterns

**Configuration:**
```json
{
  "resultCacheTTL": 3600,     // 1 hour in seconds
  "embeddingCacheTTL": 86400,  // 24 hours in seconds
  "maxCacheSize": 10000,      // max entries
  "enableResultCompression": true
}
```

## Monitoring & Optimization

### Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search Latency | < 100ms | `rufflo rag metrics latency` |
| Index Size | < 5GB per 100K docs | `rufflo rag metrics size` |
| Relevance @ 10 | > 0.7 | Manual evaluation |
| Cache Hit Rate | > 80% | `rufflo rag metrics cache` |
| Model Switch Success | 100% | Migration audit |

### Optimization Commands

```bash
# Check performance metrics
npx claude-flow rag metrics \
  --searchLatency \
  --cacheHitRate \
  --indexSize

# Optimize index
npx claude-flow rag optimize \
  --rebalanceHNSW \
  --cleanupStale \
  --maxAgeDays 30

# Tune search parameters
npx claude-flow rag tune \
  --efSearch 60 \
  --mMRLambda 0.3 \
  --validate true
```

## Best Practices

1. **Always use hybrid search** - combines semantic + keyword power
2. **Set appropriate M value** - M=16 balances build speed vs search quality
3. **Cache aggressively** - embedding generation is the expensive part
4. **Monitor relevance** - regularly evaluate top-k results
5. **Version your models** - never assume model migration is transparent
6. **Use MMR for broad topics** - prevents redundant results
7. **Rerank critical results** - cross-encoder for top 5-10 results only
8. **Persist metadata** - store source, version, tags with each chunk
9. **Test with real queries** - don't rely on synthetic test data only
10. **Plan model retirement** - deprecate old models gracefully with 30-day notice
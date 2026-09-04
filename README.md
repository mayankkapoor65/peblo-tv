# Peblo TV Mini — CMS-to-Catalogue-to-Viewer Platform

A production-grade, three-tier streaming media platform featuring an Editorial CMS, Atomic Publish Engine, PostgreSQL persistence, and a Netflix-style Consumer Viewer.

---

## 🚀 Quick Start (Docker Compose)

The entire platform brings up PostgreSQL, FastAPI API, CMS Portal, and Consumer Viewer seeded and published out of the box with one command:

```bash
docker-compose up --build
```

### Access URLs:
- **Consumer Viewer**: [http://localhost:5174](http://localhost:5174)
- **Internal CMS Portal**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### Demo Credentials (Pre-seeded):
- **Admin**: `admin@peblo.tv` / `admin123` (Full CRUD + Atomic Publish)
- **Editor**: `editor@peblo.tv` / `editor123` (Full CRUD, publish forbidden with 403)
*(The CMS header includes an instant one-click role switcher between Admin and Editor for manual testing.)*

---

## 🏗️ Technical Architecture & Design

### 1. How Publishing is Made Atomic & Crash Resilience
Publishing compiles the validated catalogue payload into a deterministic JSON byte buffer. The storage layer uses a **two-phase atomic rename guarantee**:
1. The payload is written to a temporary sibling file in the target directory (e.g. `.catalog.json.tmp_<uuid>`).
2. Data is flushed and synced to physical storage (`os.fsync`).
3. `os.replace(temp_path, target_path)` performs an **atomic inode swap** on POSIX and Windows.
4. If the process dies mid-publish, the existing `catalog.json` remains completely untouched. Readers on `/catalog` will **never** observe a partial, empty, or corrupted JSON file. Orphaned `.tmp` files are harmless and overwritten on the next publish.
5. Every publish attempt is recorded in the `publish_runs` database table with timestamp, user, show/episode count, SHA-256 checksum, and status (`success` / `failed`).

### 2. Storage Abstraction & Swapping to Cloudflare R2
All storage operations implement the `StorageProvider` abstract class (`put`, `get`, `atomic_write`, `exists`, `delete`, `get_public_url`).
- To swap from local disk storage to **Cloudflare R2** (or AWS S3 / MinIO), **zero code changes are required**. Simply set in `.env`:
  ```env
  STORAGE_BACKEND=s3
  S3_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
  S3_ACCESS_KEY=<r2_access_key>
  S3_SECRET_KEY=<r2_secret_key>
  S3_BUCKET_NAME=peblo-tv-catalog
  ```

### 3. Search Engine Implementation & Scale Evolution
- **Current Design**: `GET /catalog/search?q=&category=&language=&section=` composes dynamic SQL queries with joins across `shows`, `seasons`, and `episodes` with `ILIKE` filtering, indexed foreign keys, and SQL-level pagination.
- **Scale Limits**: Standard relational queries perform well up to ~50,000–100,000 episodes. Beyond this, complex joins and unindexed wildcard pattern scans increase query latency and CPU utilization.
- **Next Evolutionary Step**:
  1. Add PostgreSQL Full-Text Search with `tsvector` and GIN indexing.
  2. For millions of items: Integrate **Typesense** or **Meilisearch** as a read-side search index synced via change-data-capture (Debezium/Kafka) to provide typo tolerance, instant filtering, and sub-10ms response times.

### 4. Why Serve a Pre-published Catalogue File vs. Live DB Queries?
- **Why Pre-published**:
  - **Extreme Throughput & Sub-5ms Latency**: A static JSON catalogue served from CDN / edge storage requires 0 database queries, allowing millions of concurrent viewers without database strain.
  - **Decoupled Reliability**: Database maintenance, migrations, or editorial CMS traffic cannot cause viewer outages.
  - **Cost Efficiency**: Serving static files from CDN edge caches is orders of magnitude cheaper than provisioning massive read-replica database clusters.
- **Where It Bites**:
  - **Eventual Consistency**: Changes in the CMS are not live until a publish job completes.
  - **Monolithic Payload Size**: If the catalogue grows to >10,000 shows, a single JSON file becomes too large (>5MB). Solution: Shard into section-level bundles (`/catalog/sections/trending.json`) and paginated show chunks.

### 5. AI Tooling & Tradeoffs
- **AI Tool Usage**: Used for generating realistic seed datasets, schema drafts, and CSS glassmorphic tokens.
- **Where AI Output Was Rejected**:
  - Rejected suggestions to perform search in-memory in Python over all database records; replaced with SQL-composed queries.
  - Rejected non-atomic direct file write patterns; replaced with guaranteed `tempfile` + `os.replace` filesystem swaps.

### 6. Production Secrets Management & Critical Alerts
- **Secrets Management**: In production, secrets (`DATABASE_URL`, `SECRET_KEY`, `S3_SECRET_KEY`) must be injected via AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets—never stored in git.
- **Critical Alert Metric**: **Catalogue Staleness & Consecutive Publish Failure Alert**. If `publish_runs` logs 2 consecutive failures or if the catalogue hash has not updated in >48 hours despite active editorial modifications, page the platform on-call engineer immediately.

---

## ⏱️ Approximate Time Spent Per Part
- **Part A (Schema, Storage Abstraction, Artwork Validation, CRUD, Publish Engine, Search)**: ~2.5 hrs
- **Part B (Internal CMS React + TS, Diagnostics Report, RBAC)**: ~1.5 hrs
- **Part C (Consumer Viewer React + TS, Netflix-style layout, Season 0 Player)**: ~1.5 hrs
- **Part D (Docker Compose, CI/CD Workflow, Seed Data, Health Endpoint)**: ~1 hr
- **Part E (Documentation & Verification Tests)**: ~0.5 hr

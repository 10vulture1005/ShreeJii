# Shree Ji — Inventory Backend (FastAPI)

Bulk retail inventory management API for the Shree Ji boutique clothing store.

## Quick Start

### Prerequisites
- Python 3.10+
- PostgreSQL 14+

### Setup

1. **Create the database:**
   ```bash
   createdb shreeji_db
   psql -d shreeji_db -f init_db.sql
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure database URL** (optional):
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/shreeji_db"
   ```

4. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Open Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/inventory/restock` | Add/restock product inventory |
| `GET`  | `/api/products` | Get all in-stock products |
| `POST` | `/api/checkout` | Purchase product (deduct stock) |
| `GET`  | `/` | Health check |

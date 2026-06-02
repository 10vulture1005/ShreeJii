-- ============================================================
-- Shree Ji Bulk Retail Inventory System
-- PostgreSQL Database Schema & Indexing
-- ============================================================

-- 1. Product Master: Defines the core product attributes
CREATE TABLE IF NOT EXISTS products (
    sku_id VARCHAR(50) PRIMARY KEY,              -- Formatted string: e.g., 'WEA-KAN-RED'
    name VARCHAR(255) NOT NULL,
    source_name VARCHAR(100) NOT NULL,           -- e.g., 'Weaver A'
    clothing_type VARCHAR(100) NOT NULL,         -- e.g., 'Kanjivaram'
    color VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Ledger: Tracks live stock counts
CREATE TABLE IF NOT EXISTS inventory (
    sku_id VARCHAR(50) PRIMARY KEY REFERENCES products(sku_id) ON DELETE CASCADE,
    stock_count INT NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Composite index for fast duplicate-check on incoming shipments
CREATE INDEX IF NOT EXISTS idx_products_source_type_color
ON products (source_name, clothing_type, color);

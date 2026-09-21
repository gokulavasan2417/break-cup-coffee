-- =============================================
-- Break Cup Coffee Database Schema (PostgreSQL)
-- Compatible with Supabase SQL Editor
-- =============================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    items_summary TEXT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast order lookups by user email
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);

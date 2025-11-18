CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_debt DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    article VARCHAR(100) NOT NULL,
    image_url TEXT,
    hint TEXT,
    sale_price DECIMAL(10, 2),
    purchase_price DECIMAL(10, 2),
    quantity INTEGER DEFAULT 1,
    supplier_id INTEGER REFERENCES suppliers(id),
    is_completed BOOLEAN DEFAULT FALSE,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_completed ON products(is_completed);
CREATE INDEX idx_products_supplier ON products(supplier_id);
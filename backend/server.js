const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ===============================
// SUPABASE POSTGRESQL CONNECTION
// ===============================

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect()
    .then(client => {
        console.log('⚡ Connected successfully to Supabase PostgreSQL!');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:');
        console.error(err);
    });


// ===============================
// SIGNUP
// ===============================

app.post('/api/signup', async (req, res) => {
    let { fullname, email, password } = req.body || {};

    if (!fullname || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Full name, email, and password are all required."
        });
    }

    fullname = fullname.trim();
    email = email.trim().toLowerCase();

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sqlInsert = `
            INSERT INTO users (fullname, email, password)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        const result = await db.query(sqlInsert, [
            fullname,
            email,
            hashedPassword
        ]);

        console.log(`📦 New user saved to Supabase: ${fullname}`);

        res.status(201).json({
            success: true,
            message: "Account brewed successfully!"
        });

    } catch (error) {
        console.error('Signup error:', error);

        // PostgreSQL duplicate key error
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: "This email is already registered!"
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error during registration."
        });
    }
});


// ===============================
// LOGIN
// ===============================

app.post('/api/login', async (req, res) => {
    let { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    email = email.trim().toLowerCase();

    try {
        const sqlSelect = `
            SELECT *
            FROM users
            WHERE LOWER(email) = $1
        `;

        const result = await db.query(sqlSelect, [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Account not found. Please sign up!"
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password credentials."
            });
        }

        console.log(
            `🔓 User logged in from Supabase records: ${user.fullname}`
        );

        res.json({
            success: true,
            message: `Welcome back, ${user.fullname}!`,
            username: user.fullname
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            success: false,
            message: "Database query error."
        });
    }
});


// ===============================
// PLACE ORDER
// ===============================

app.post('/api/orders', async (req, res) => {
    let { email, items, total } = req.body || {};

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Please log in first before placing an order!"
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Order must contain at least one item!"
        });
    }

    email = email.trim().toLowerCase();

    try {
        const itemsSummary = items
            .map(item => (item && item.name) ? item.name : 'Unknown Item')
            .join(', ');

        const sqlOrderInsert = `
            INSERT INTO orders
                (user_email, items_summary, total_price)
            VALUES
                ($1, $2, $3)
            RETURNING order_id
        `;

        const result = await db.query(sqlOrderInsert, [
            email,
            itemsSummary,
            total || 0
        ]);

        const orderId = result.rows[0].order_id;

        console.log(
            `🛒 Order #${orderId} successfully logged for ${email}`
        );

        res.status(201).json({
            success: true,
            message:
                "Order successfully placed! Your hot brew will be ready for pickup in 10 minutes. ☕"
        });

    } catch (error) {
        console.error('Order error:', error);

        res.status(500).json({
            success: false,
            message: "Database error while placing order."
        });
    }
});


// ===============================
// GET ORDER HISTORY
// ===============================

app.get('/api/orders/:email', async (req, res) => {
    const userEmail = req.params.email ? req.params.email.trim().toLowerCase() : '';

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message: "Email is required."
        });
    }

    try {
        const sqlSelectOrders = `
            SELECT
                order_id,
                user_email,
                items_summary,
                total_price,
                order_date
            FROM orders
            WHERE LOWER(user_email) = $1
            ORDER BY order_date DESC
        `;

        const result = await db.query(
            sqlSelectOrders,
            [userEmail]
        );

        console.log(
            `📦 Sent ${result.rows.length} order history rows to browser for: ${userEmail}`
        );

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {
        console.error("❌ SQL Query Error:", error);

        res.status(500).json({
            success: false,
            message: "Database error retrieving order history."
        });
    }
});


// ===============================
// START SERVER
// ===============================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `☕ Break Cup backend engine online at: http://localhost:${PORT}`
        );
    });
}

module.exports = app;
const express = require('express');
const cors = require('cors');
const db = require('./db'); // This links to your database settings
const app = express();
const bcrypt = require('bcryptjs');

app.use(cors());
app.use(express.json());

// API route to get user data for the dashboard
app.get('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.query('SELECT wallet_balance, locked_balance FROM users WHERE id = $1', [id]);
        
        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Funding to record activity
// Add activity when funding
app.post('/fund-test', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        await db.query('BEGIN');
        await db.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, userId]);
        await db.query('INSERT INTO contributions (user_id, amount, status) VALUES ($1, $2, $3)', [userId, amount, 'funded']);
        await db.query('COMMIT');
        res.json({ message: "Success" });
    } catch (err) { await db.query('ROLLBACK'); res.status(500).send(err.message); }
});

// Update Joining to record activity
// 1. JOIN CIRCLE (With Balance Check)
app.post('/join-circle', async (req, res) => {
    const { userId, circleId, amount } = req.body;
    try {
        const user = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        const currentBalance = parseFloat(user.rows[0].wallet_balance);

        if (currentBalance < amount) {
            return res.status(400).json({ error: "Insufficient funds. Please fund your wallet first." });
        }

        await db.query('BEGIN');
        await db.query('INSERT INTO circle_members (user_id, circle_id) VALUES ($1, $2)', [userId, circleId]);
        await db.query('UPDATE users SET wallet_balance = wallet_balance - $1, locked_balance = locked_balance + $1 WHERE id = $2', [amount, userId]);
        await db.query('INSERT INTO contributions (user_id, circle_id, amount, status) VALUES ($1, $2, $3, $4)', [userId, circleId, -amount, 'joined_circle']);
        await db.query('COMMIT');
        res.json({ message: "Joined successfully" });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: "Already joined or database error" });
    }
});

app.get('/circles', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                c.id, 
                c.title as name, 
                c.contribution_amount, 
                -- This subquery calculates the progress for each circle
                (SELECT COALESCE(SUM(amount), 0) FROM contributions 
                 WHERE circle_id = c.id AND status = 'success') as current_savings
            FROM circles c 
            WHERE c.is_active = TRUE
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get Contribution History

app.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(`
            SELECT 
                COALESCE(c.title, 'Wallet Transaction') as circle_name, 
                h.amount, 
                h.status, 
                h.created_at 
            FROM contributions h 
            LEFT JOIN circles c ON h.circle_id = c.id 
            WHERE h.user_id = $1 
            ORDER BY h.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/admin/manual-payout', async (req, res) => {
    const { circleId, userId } = req.body;
    try {
        // Calculate pot from successful contributions
        const pot = await db.query("SELECT SUM(amount) FROM contributions WHERE circle_id = $1 AND status = 'success'", [circleId]);
        const amount = parseFloat(pot.rows[0].sum || 0);

        if (amount <= 0) return res.status(400).json({ error: "No funds available to pay out" });

        await db.query("BEGIN");
        await db.query("UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2", [amount, userId]);
        await db.query("UPDATE contributions SET status = 'paid_out' WHERE circle_id = $1", [circleId]);
        await db.query("COMMIT");

        res.json({ message: `Success! Paid out ₦${amount}` });
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Payout Error:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
});

// 2. WITHDRAW (Fixed & Strict)
app.post('/withdraw', async (req, res) => {
    const { userId, amount } = req.body;
    console.log(`🏦 Withdrawal Attempt: User ${userId}, Amount ₦${amount}`);

    try {
        // 1. Get current balance and ensure it's treated as a number
        const user = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        
        if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
        
        const currentBalance = parseFloat(user.rows[0].wallet_balance);

        // 2. Strict Logic Checks
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }
        if (currentBalance < amount) {
            console.log(`❌ Fail: Balance ₦${currentBalance} is less than ₦${amount}`);
            return res.status(400).json({ error: "Insufficient balance" });
        }

        await db.query('BEGIN');

        // 3. Update Balance
        await db.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);

        // 4. Log History
        // NOTE: We check if circle_id is required. If this fails, your DB needs an ALTER TABLE.
        await db.query(
            'INSERT INTO contributions (user_id, amount, status) VALUES ($1, $2, $3)',
            [userId, -amount, 'withdrawn']
        );

        await db.query('COMMIT');
        console.log("✅ Withdrawal Success!");
        res.json({ message: "Withdrawal successful" });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("🚨 DATABASE ERROR:", err.message); // <--- Look for this in your Terminal!
        res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
});

// REGISTER
app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    // NEW: Stop empty submissions
    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required!" });
    }
    try {
        const userCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "Email already exists!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            "INSERT INTO users (name, email, password, wallet_balance, locked_balance) VALUES ($1, $2, $3, 0, 0) RETURNING id, name, email",
            [name, email, hashedPassword]
        );
        res.json(newUser.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. STRICT CHECK: Stop empty strings
    if (!email || !password || email.trim() === "" || password.trim() === "") {
        console.log("⚠️ Blocked empty login attempt");
        return res.status(400).json({ error: "Email and Password are required" });
    }

    try {
        const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(400).json({ error: "User not found" });

        const validPass = await bcrypt.compare(password, user.rows[0].password);
        if (!validPass) return res.status(400).json({ error: "Incorrect password" });

        const { password: _, ...userData } = user.rows[0]; 
        res.json(userData); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => console.log("🚀 Backend Server running on port 5000"));
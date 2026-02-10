const db = require('./db');

const joinCircle = async (userId, circleId, slots = 1) => {
    try {
        // 1. Check if the circle exists
        const circle = await db.query('SELECT * FROM circles WHERE id = $1', [circleId]);
        if (circle.rows.length === 0) return console.log("Circle not found");

        const details = circle.rows[0];

        // 2. Point #4: Lock the first contribution as security
        const securityDeposit = parseFloat(details.contribution_amount) * slots;

        // 3. Check if user has enough in wallet to join (Available Balance)
        const user = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        const balance = parseFloat(user.rows[0].wallet_balance);

        if (balance < securityDeposit) {
            return console.log(`Insufficient funds. You need ₦${securityDeposit} to join.`);
        }

        // 4. Move money from Available to Locked
        await db.query('BEGIN'); // Start Transaction
        await db.query('UPDATE users SET wallet_balance = wallet_balance - $1, locked_balance = locked_balance + $1 WHERE id = $2', 
            [securityDeposit, userId]);

        // 5. Register the user in the circle
        await db.query('INSERT INTO circle_members (user_id, circle_id, slot_number) VALUES ($1, $2, $3)', 
            [userId, circleId, slots]);
        
        await db.query('COMMIT'); // Save everything
        console.log(`✅ Success! You joined "${details.title}". ₦${securityDeposit} locked as security.`);

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Join Error:", err);
    }
};

// Test it: User ID 2 (Test User) joining Circle ID 1
joinCircle(2, 1, 1);
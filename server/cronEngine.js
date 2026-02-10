const db = require('./db');
require('dotenv').config();

const runDeductions = async () => {
    console.log("⏰ 12:00 AM: Starting Auto-Deductions...");

    try {
        // 1. Get all members of active circles
        // Only get members who have enough money for their contribution
const members = await db.query(`
    SELECT cm.user_id, cm.circle_id, c.contribution_amount, u.wallet_balance 
    FROM circle_members cm
    JOIN users u ON cm.user_id = u.id
    JOIN circles c ON cm.circle_id = c.id
    WHERE u.wallet_balance >= c.contribution_amount
`);
        for (const user of members.rows) {
            const userId = user.user_id;
            const circleId = user.circle_id;
            const amount = 1000; // Hardcoded for our test

            if (parseFloat(user.wallet_balance) >= amount) {
                // START TRANSACTION
                await db.query('BEGIN');

                // 2. Deduct from User Wallet
                await db.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, userId]);

                // 3. Record the Contribution
                await db.query(
                    'INSERT INTO contributions (user_id, circle_id, amount, status) VALUES ($1, $2, $3, $4)',
                    [userId, circleId, amount, 'success']
                );

                await db.query('COMMIT');
                console.log(`✅ Deducted ₦${amount} from User ID: ${userId}`);

                // --- THE AUTO-PAYOUT CHECK ---
                const potCheck = await db.query(
                    "SELECT SUM(amount) FROM contributions WHERE circle_id = $1 AND status = 'success'", 
                    [circleId]
                );
                const currentPot = parseFloat(potCheck.rows[0].sum || 0);

                // If the pot hits ₦10,000, pay the user!
                if (currentPot >= 10000) {
                    console.log(`💰 Pot reached ₦${currentPot}! Triggering Auto-Payout...`);
                    
                    await db.query('BEGIN');
                    // Add pot to user's wallet
                    await db.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [currentPot, userId]);
                    // Mark contributions as paid_out so they don't get counted twice
                    await db.query("UPDATE contributions SET status = 'paid_out' WHERE circle_id = $1", [circleId]);
                    await db.query('COMMIT');
                    
                    console.log(`🎉 Payout of ₦${currentPot} successful for User ${userId}!`);
                }
            } else {
                console.log(`⚠️ User ID: ${userId} defaulted (Insufficient Funds)`);
            }
        }
    } catch (err) {
        console.error("Cron Error:", err.message);
    }
};

// Run the function
runDeductions();
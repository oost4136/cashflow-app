const db = require('./db');

const processWinnerPayout = async (circleId, userId) => {
    try {
        await db.query('BEGIN');

        // 1. Calculate the total pool for this circle
        const circleRes = await db.query(
            'SELECT contribution_amount, total_slots, admin_fee FROM circles WHERE id = $1', 
            [circleId]
        );
        const circle = circleRes.rows[0];
        
        const totalPool = parseFloat(circle.contribution_amount) * parseInt(circle.total_slots);
        const adminFee = parseFloat(circle.admin_fee);
        const userPayout = totalPool - adminFee;

        // 2. Pay the Winner (Add to their Available Balance)
        await db.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', 
            [userPayout, userId]
        );

        // 3. Record the payout in a new history table (Optional but recommended)
        console.log(`💰 PAYOUT SUCCESSFUL!`);
        console.log(`Total Pool: ₦${totalPool}`);
        console.log(`Admin Fee (Your Profit): ₦${adminFee}`);
        console.log(`User Received: ₦${userPayout}`);

        await db.query('COMMIT');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Payout Error:", err);
    }
};

// Test: Pay User 2 for Circle 1
processWinnerPayout(1, 2);
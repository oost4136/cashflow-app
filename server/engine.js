const db = require('./db');

const processDeduction = async (userId, circleId) => {
    // 1. Get User Balance & Circle Rules
    const userQuery = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    const circleQuery = await db.query('SELECT amount, admin_fee FROM circles WHERE id = $1', [circleId]);

    const balance = parseFloat(userQuery.rows[0].wallet_balance);
    const amountToDeduct = parseFloat(circleQuery.rows[0].amount);
    const totalNeeded = amountToDeduct; 

    // 2. The Logic Check
    if (balance >= totalNeeded) {
        const newBalance = balance - totalNeeded;
        
        // 3. Save the new balance (The "Deduction")
        await db.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, userId]);
        
        // 4. Record the contribution so the user sees it in their history
        await db.query('INSERT INTO contributions(user_id, circle_id, amount, status) VALUES($1, $2, $3, $4)', 
        [userId, circleId, amountToDeduct, 'paid']);

        console.log("Deduction Successful!");
    } else {
        console.log("Insufficient Funds - Member Flagged");
        // Here we would trigger your Point #8: Default & Penalty Rules
    }
};
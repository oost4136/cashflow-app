const db = require('./db');

const addMissingUser = async () => {
    try {
        // We are adding the email you used for the payment
        const text = 'INSERT INTO users(full_name, email, wallet_balance) VALUES($1, $2, $3) RETURNING *';
        const values = ['Test User', 'your_email@gmail.com', 0]; 

        const res = await db.query(text, values);
        console.log("✅ Missing User Added:", res.rows[0]);
    } catch (err) {
        console.error("Error:", err.detail || err.message);
    }
};

addMissingUser();
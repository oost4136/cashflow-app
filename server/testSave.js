const db = require('./db');

const saveNewUser = async (name, email) => {
    try {
        const text = 'INSERT INTO users(full_name, email, wallet_balance) VALUES($1, $2, $3) RETURNING *';
        const values = [name, email, 0]; // 0 is the starting balance

        const res = await db.query(text, values);
        console.log("User Saved Successfully:", res.rows[0]);
    } catch (err) {
        console.error("Error saving user:", err.stack);
    }
};

// Calling the function to save a test person
saveNewUser("John Doe", "john@example.com");
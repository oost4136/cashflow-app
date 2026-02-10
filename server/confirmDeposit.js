const db = require('./db');
const { verifyPayment } = require('./paystack');

// 1. The Logic to Update Wallet
const creditUserWallet = async (reference) => {
    console.log(`Checking status for reference: ${reference}...`);

    // A. Ask Paystack if the money is real
    const paymentData = await verifyPayment(reference);

    if (paymentData && paymentData.status === 'success') {
        const amountPaid = paymentData.amount / 100; // Convert Kobo to Naira
        const email = paymentData.customer.email;

        console.log(`Payment Verified! Customer: ${email}, Amount: ₦${amountPaid}`);

        // B. Find the user in your database
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userRes.rows.length === 0) {
            console.log("Error: User not found in database. Did you create them first?");
            return;
        }

        const user = userRes.rows[0];
        const oldBalance = parseFloat(user.wallet_balance);
        const newBalance = oldBalance + amountPaid;

        // C. UPDATE the wallet balance
        await db.query('UPDATE users SET wallet_balance = $1 WHERE email = $2', [newBalance, email]);
        
        console.log(`SUCCESS! Wallet updated from ₦${oldBalance} to ₦${newBalance}`);

    } else {
        console.log("Payment Failed or Pending.");
    }
};

// 2. RUN IT: Replace 'YOUR_REFERENCE_HERE' with the code from your previous test
// It usually looks like 't43s7f9j21'
const myReference = 'b19c0oxxqt'; 

creditUserWallet(myReference);
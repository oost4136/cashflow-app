const axios = require('axios');
require('dotenv').config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// 1. Initialize Transaction (Get the Payment Link)
const initializePayment = async (email, amount) => {
    try {
        // Paystack expects amount in Kobo (N100 = 10000 kobo)
        const amountInKobo = amount * 100;

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amountInKobo,
                channels: ['card', 'bank', 'ussd', 'bank_transfer'], // Allow all methods
                callback_url: 'http://localhost:3000/payment-success' // Where they go after paying
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data; // Returns the payment URL
    } catch (error) {
        console.error("Paystack Error:", error.response.data);
        return null;
    }
};

// 2. Verify Transaction (Confirm we actually got the money)
const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`
                }
            }
        );

        return response.data.data; // Returns status: 'success' or 'failed'
    } catch (error) {
        console.error("Verification Error:", error.response.data);
        return null;
    }
};

module.exports = { initializePayment, verifyPayment };
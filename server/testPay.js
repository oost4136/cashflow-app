const { initializePayment } = require('./paystack');

const runTest = async () => {
    const linkData = await initializePayment("your_email@gmail.com", 1000); // Try to pay 1,000
    console.log("CLICK THIS LINK TO PAY:", linkData.authorization_url);
    console.log("PAYMENT REFERENCE:", linkData.reference);
};

runTest();
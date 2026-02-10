const { Pool } = require('pg');
require('dotenv').config();

// This tells the code how to find your database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
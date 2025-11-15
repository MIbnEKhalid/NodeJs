import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// PostgreSQL connection pool for pool
const poolConfig = {
  connectionString: process.env.NEON_POSTGRES,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const pool = new Pool(poolConfig);

// Test connection for pool
(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to neon PostgreSQL database (pool)!");
    client.release();
  } catch (err) {
    console.error("Database connection error (pool):", err);
  }
})();
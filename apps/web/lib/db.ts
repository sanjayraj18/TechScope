import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL,
  max: 1,
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

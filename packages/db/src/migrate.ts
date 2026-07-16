import { readFile } from "node:fs/promises";
import { pool } from "./client.js";

const sql = await readFile(new URL("../migrations/001_init.sql", import.meta.url), "utf-8");
await pool.query(sql);
console.log("migration applied");
await pool.end();

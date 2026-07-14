import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query("select now() as server_time, version()");
console.log(res.rows[0]);
await client.end();

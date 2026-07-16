import { pool } from "./client.js";

const crawls = await pool.query("select * from crawls order by id");
console.log("crawls:");
console.table(crawls.rows);

const counts = await pool.query(`
  select
    (select count(*) from domains)      as domains,
    (select count(*) from technologies) as technologies,
    (select count(*) from page_fetches) as page_fetches,
    (select count(*) from detections)   as detections
`);
console.table(counts.rows);

const top = await pool.query(`
  select t.name, count(*) n
  from detections d join technologies t on t.id = d.technology_id
  where d.crawl_id = 1
  group by t.name order by n desc limit 10
`);
console.log("top 10 technologies (from SQL):");
console.table(top.rows);

await pool.end();

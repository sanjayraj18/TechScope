import { query } from "@/lib/db";

export interface DashboardStats {
  domains: number;
  technologies: number;
  crawls: number;
  events: number;
}

export interface TechEvent {
  id: number;
  event_type: "added" | "removed";
  detected_at: string;
  domain: string;
  tech: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { rows } = await query(`
    select
      (select count(*)::int from domains)      as domains,
      (select count(*)::int from technologies) as technologies,
      (select count(*)::int from crawls where finished_at is not null) as crawls,
      (select count(*)::int from tech_events)  as events
  `);
  return rows[0];
}

const EVENT_SELECT = `
  select e.id, e.event_type, e.detected_at,
         dm.name as domain, t.name as tech
  from tech_events e
  join domains dm on dm.id = e.domain_id
  join technologies t on t.id = e.technology_id
`;

export async function getRecentEvents(limit = 50): Promise<TechEvent[]> {
  const { rows } = await query(
    `${EVENT_SELECT}
     order by e.detected_at desc, e.id desc
     limit $1`,
    [limit]
  );
  return rows;
}

async function latestFinishedCrawlId(): Promise<number | null> {
  const { rows } = await query(
    `select id from crawls where finished_at is not null
     order by id desc limit 1`
  );
  return rows[0]?.id ?? null;
}

export interface TechDetail {
  id: number;
  name: string;
  categories: number[];
  siteCount: number;
  sites: { domain: string; rank: number | null }[];
  events: TechEvent[];
}

export async function getTechDetail(name: string): Promise<TechDetail | null> {
  const tech = (
    await query(
      `select id, name, categories from technologies where name = $1`,
      [name]
    )
  ).rows[0];
  if (!tech) return null;

  const crawlId = await latestFinishedCrawlId();
  if (crawlId === null) return { ...tech, siteCount: 0, sites: [], events: [] };

  const [sites, count, events] = await Promise.all([
    query(
      `select dm.name as domain, dm.tranco_rank as rank
       from detections d
       join domains dm on dm.id = d.domain_id
       where d.technology_id = $1 and d.crawl_id = $2
       order by dm.tranco_rank nulls last, dm.name
       limit 100`,
      [tech.id, crawlId]
    ),
    query(
      `select count(*)::int as n from detections
       where technology_id = $1 and crawl_id = $2`,
      [tech.id, crawlId]
    ),
    query(
      `${EVENT_SELECT}
       where e.technology_id = $1
       order by e.detected_at desc, e.id desc
       limit 50`,
      [tech.id]
    ),
  ]);

  return {
    ...tech,
    siteCount: count.rows[0].n,
    sites: sites.rows,
    events: events.rows,
  };
}

export interface SiteDetail {
  id: number;
  name: string;
  tranco_rank: number | null;
  stack: { tech: string; categories: number[] }[];
  events: TechEvent[];
}

export async function getSiteDetail(name: string): Promise<SiteDetail | null> {
  const site = (
    await query(
      `select id, name, tranco_rank from domains where name = $1`,
      [name]
    )
  ).rows[0];
  if (!site) return null;

  const crawlId = await latestFinishedCrawlId();
  if (crawlId === null) return { ...site, stack: [], events: [] };

  const [stack, events] = await Promise.all([
    query(
      `select t.name as tech, t.categories
       from detections d
       join technologies t on t.id = d.technology_id
       where d.domain_id = $1 and d.crawl_id = $2
       order by t.name`,
      [site.id, crawlId]
    ),
    query(
      `${EVENT_SELECT}
       where e.domain_id = $1
       order by e.detected_at desc, e.id desc
       limit 50`,
      [site.id]
    ),
  ]);

  return { ...site, stack: stack.rows, events: events.rows };
}

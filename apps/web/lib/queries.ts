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

export async function getRecentEvents(limit = 50): Promise<TechEvent[]> {
  const { rows } = await query(
    `select e.id, e.event_type, e.detected_at,
            dm.name as domain, t.name as tech
     from tech_events e
     join domains dm on dm.id = e.domain_id
     join technologies t on t.id = e.technology_id
     order by e.detected_at desc, e.id desc
     limit $1`,
    [limit]
  );
  return rows;
}

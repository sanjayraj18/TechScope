import { getDashboardStats, getRecentEvents } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventsTable } from "@/components/events-table";

export const revalidate = 300;

export default async function Dashboard() {
  const [stats, events] = await Promise.all([
    getDashboardStats(),
    getRecentEvents(),
  ]);

  const statCards = [
    { label: "Domains tracked", value: stats.domains },
    { label: "Technologies", value: stats.technologies },
    { label: "Crawls completed", value: stats.crawls },
    { label: "Change events", value: stats.events },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">TechScope</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Technology adoption changes across the top{" "}
        {stats.domains.toLocaleString()} websites
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-normal tracking-wide uppercase">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">
                {s.value.toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-medium">Recent changes</h2>
      <EventsTable events={events} />
    </main>
  );
}

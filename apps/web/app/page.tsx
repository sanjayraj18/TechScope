import { getDashboardStats, getRecentEvents } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Change</TableHead>
            <TableHead>Technology</TableHead>
            <TableHead>Site</TableHead>
            <TableHead className="text-right">Detected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell
                className={`font-mono text-xs ${
                  e.event_type === "added" ? "" : "text-muted-foreground"
                }`}
              >
                {e.event_type === "added" ? "+ added" : "− removed"}
              </TableCell>
              <TableCell className="font-medium">{e.tech}</TableCell>
              <TableCell className="text-muted-foreground">{e.domain}</TableCell>
              <TableCell className="text-muted-foreground text-right text-xs">
                {new Date(e.detected_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {events.length === 0 && (
        <p className="text-muted-foreground mt-4 text-sm">
          No change events yet — they appear once two crawls have been compared.
        </p>
      )}
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTechDetail } from "@/lib/queries";
import { categoryName } from "@/lib/categories";
import { EventsTable } from "@/components/events-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const revalidate = 300;

export default async function TechPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const tech = await getTechDetail(decodeURIComponent(name));
  if (!tech) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/" className="text-muted-foreground text-sm hover:underline">
        ← TechScope
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{tech.name}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {tech.categories.map(categoryName).join(" · ") || "Uncategorized"}
        {" — "}detected on {tech.siteCount.toLocaleString()} of the tracked sites
      </p>

      <h2 className="mt-12 text-lg font-medium">Sites using {tech.name}</h2>
      {tech.sites.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Not detected on any tracked site in the latest crawl.
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Rank</TableHead>
              <TableHead>Site</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tech.sites.map((s) => (
              <TableRow key={s.domain}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {s.rank ?? "—"}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/site/${encodeURIComponent(s.domain)}`}
                    className="hover:underline"
                  >
                    {s.domain}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {tech.siteCount > tech.sites.length && (
        <p className="text-muted-foreground mt-2 text-xs">
          Showing the top {tech.sites.length} by rank.
        </p>
      )}

      <h2 className="mt-12 text-lg font-medium">Change history</h2>
      <EventsTable events={tech.events} hide="tech" />
    </main>
  );
}

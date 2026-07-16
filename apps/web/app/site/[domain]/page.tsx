import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteDetail } from "@/lib/queries";
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

export default async function SitePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const site = await getSiteDetail(decodeURIComponent(domain));
  if (!site) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <Link href="/" className="text-muted-foreground text-sm hover:underline">
        ← TechScope
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{site.name}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {site.tranco_rank !== null
          ? `Tranco rank ${site.tranco_rank.toLocaleString()}`
          : "Unranked"}
        {" — "}
        {site.stack.length} technologies detected in the latest crawl
      </p>

      <h2 className="mt-12 text-lg font-medium">Current stack</h2>
      {site.stack.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Nothing detected in the latest crawl — the site may have failed to
          fetch or blocks crawlers.
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Technology</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {site.stack.map((s) => (
              <TableRow key={s.tech}>
                <TableCell className="font-medium">
                  <Link
                    href={`/tech/${encodeURIComponent(s.tech)}`}
                    className="hover:underline"
                  >
                    {s.tech}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.categories.map(categoryName).join(" · ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <h2 className="mt-12 text-lg font-medium">Change history</h2>
      <EventsTable events={site.events} hide="domain" />
    </main>
  );
}

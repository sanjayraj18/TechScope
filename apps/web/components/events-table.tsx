import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TechEvent } from "@/lib/queries";
import Link from "next/link";

export function EventsTable({
  events,
  hide,
}: {
  events: TechEvent[];
  hide?: "tech" | "domain";
}) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground mt-4 text-sm">
        No change events recorded yet.
      </p>
    );
  }

  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Change</TableHead>
          {hide !== "tech" && <TableHead>Technology</TableHead>}
          {hide !== "domain" && <TableHead>Site</TableHead>}
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
            {hide !== "tech" && (
              <TableCell className="font-medium">
                <Link
                  href={`/tech/${encodeURIComponent(e.tech)}`}
                  className="hover:underline"
                >
                  {e.tech}
                </Link>
              </TableCell>
            )}
            {hide !== "domain" && (
              <TableCell className="text-muted-foreground">
                <Link
                  href={`/site/${encodeURIComponent(e.domain)}`}
                  className="hover:underline"
                >
                  {e.domain}
                </Link>
              </TableCell>
            )}
            <TableCell className="text-muted-foreground text-right text-xs">
              {new Date(e.detected_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

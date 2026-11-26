import { requireAuthContext } from "@/lib/auth";
import { getNextInvoiceNumber, listClientInvoices } from "@/lib/data-service";
import { InvoicesClient } from "@/components/factures/invoices-client";

export const dynamic = "force-dynamic";

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; action?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const [invoices, nextInvoiceNumber] = await Promise.all([
    listClientInvoices({ year, month }),
    getNextInvoiceNumber(year),
  ]);

  return (
    <InvoicesClient
      invoices={invoices}
      nextInvoiceNumber={nextInvoiceNumber}
      year={year}
      month={month}
      role={ctx.profile.role}
      openCreateInitially={sp.action === "nouveau"}
    />
  );
}

import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { getClientInvoiceById } from "@/lib/data-service";
import { PrintInvoiceView } from "@/components/factures/print-invoice-view";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthContext();
  const { id } = await params;
  const invoice = await getClientInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return <PrintInvoiceView invoice={invoice} />;
}

import { requireAuthContext } from "@/lib/auth";
import { getMonthlyOverviewData } from "@/lib/data-service";
import { ExportCenterClient } from "@/components/export/export-center-client";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requireAuthContext();
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const overview = await getMonthlyOverviewData(year, month);

  return (
    <ExportCenterClient
      year={year}
      month={month}
      daysInMonth={overview.daysInMonth}
      cashDaysCount={overview.cashRegisters.length}
      draftCashCount={overview.kpis.draftCashCount}
      missingZTickets={overview.kpis.missingZTickets}
      expensesCount={overview.expenses.length}
      missingReceiptFiles={overview.kpis.missingReceiptFiles}
      invoicesCount={overview.invoices.length}
      pendingInvoicesCount={overview.kpis.pendingInvoicesCount}
      totalRevenue={overview.kpis.totalRevenue}
      totalExpenses={overview.kpis.totalExpenses}
    />
  );
}

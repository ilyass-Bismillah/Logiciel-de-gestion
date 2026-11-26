import { requireAuthContext } from "@/lib/auth";
import { listExpenseReceipts } from "@/lib/data-service";
import { ExpensesClient } from "@/components/justificatifs/expenses-client";

export const dynamic = "force-dynamic";

export default async function JustificatifsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; action?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const expenses = await listExpenseReceipts({ year, month });

  return (
    <ExpensesClient
      expenses={expenses}
      year={year}
      month={month}
      role={ctx.profile.role}
      openCreateInitially={sp.action === "nouveau"}
    />
  );
}

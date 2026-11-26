import { requireAuthContext } from "@/lib/auth";
import { listCashRegisters } from "@/lib/data-service";
import { CashRegisterClient } from "@/components/caisse/cash-register-client";

export const dynamic = "force-dynamic";

export default async function CaissePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; action?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const registers = await listCashRegisters({ year, month });

  return (
    <CashRegisterClient
      registers={registers}
      year={year}
      month={month}
      role={ctx.profile.role}
      openCreateInitially={sp.action === "nouveau"}
    />
  );
}

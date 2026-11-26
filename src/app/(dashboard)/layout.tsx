import { requireAuthContext } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuthContext();

  return (
    <AppShell profile={ctx.profile} isDemoMode={ctx.isDemoMode}>
      {children}
    </AppShell>
  );
}

import { requireAuthContext } from "@/lib/auth";
import { listTeamProfiles } from "@/lib/data-service";
import { SettingsClient } from "@/components/parametres/settings-client";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const ctx = await requireAuthContext();
  const profiles =
    ctx.profile.role === "admin" || ctx.profile.role === "accountant"
      ? await listTeamProfiles()
      : [ctx.profile];

  return (
    <SettingsClient
      profiles={profiles}
      currentUserId={ctx.userId}
      currentUserRole={ctx.profile.role}
      isDemoMode={ctx.isDemoMode}
    />
  );
}

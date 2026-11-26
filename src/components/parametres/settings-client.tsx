"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  ShieldCheck,
  UserPlus,
  Loader2,
  Database,
} from "lucide-react";
import {
  createTeamMemberAction,
  updateUserRoleAction,
} from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getRoleLabel, RESTAURANT_DEFAULT_INFO } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";

export function SettingsClient({
  profiles,
  currentUserId,
  currentUserRole,
  isDemoMode,
}: {
  profiles: Profile[];
  currentUserId: string;
  currentUserRole: UserRole;
  isDemoMode: boolean;
}) {
  const router = useRouter();
  const isAdmin = currentUserRole === "admin";
  const [modalOpen, setModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const res = await updateUserRoleAction({ userId, role });
    if (!res.success) toast.error(res.error ?? "Impossible de changer le rôle.");
    else {
      toast.success("Rôle utilisateur mis à jour.");
      router.refresh();
    }
  };

  const handleToggleActive = async (profile: Profile) => {
    const res = await updateUserRoleAction({
      userId: profile.id,
      role: profile.role,
      is_active: !profile.is_active,
    });
    if (!res.success) toast.error(res.error ?? "Erreur de mise à jour.");
    else {
      toast.success(
        profile.is_active ? "Compte désactivé." : "Compte réactivé."
      );
      router.refresh();
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await createTeamMemberAction(fd);
      if (!res.success) {
        toast.error(res.error ?? "Erreur lors de la création.");
      } else {
        toast.success("Membre d'équipe ajouté avec succès.");
        setModalOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Paramètres &amp; Gestion d&apos;Équipe
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Coordonnées fiscales de Tylias et gestion des accès par rôle
            (RBAC).
          </p>
        </div>

        {isAdmin && (
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Ajouter un utilisateur
          </Button>
        )}
      </div>

      {/* Infos Établissement & État Connexion */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Identité Fiscale — {RESTAURANT_DEFAULT_INFO.name}
            </CardTitle>
            <CardDescription>
              Mentions affichées sur les factures B2B et exports comptables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Raison sociale</span>
              <span className="font-semibold text-slate-900">
                {RESTAURANT_DEFAULT_INFO.legal_name}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">ICE</span>
              <span className="font-mono font-semibold text-slate-900">
                {RESTAURANT_DEFAULT_INFO.ice}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Identifiant Fiscal (IF)</span>
              <span className="font-mono font-semibold text-slate-900">
                {RESTAURANT_DEFAULT_INFO.if_number}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Registre de Commerce (RC)</span>
              <span className="font-mono text-slate-800">
                {RESTAURANT_DEFAULT_INFO.rc}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Taxe Professionnelle / Patente</span>
              <span className="font-mono text-slate-800">
                {RESTAURANT_DEFAULT_INFO.patente}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Adresse</span>
              <span className="text-right text-slate-800">
                {RESTAURANT_DEFAULT_INFO.address}, {RESTAURANT_DEFAULT_INFO.city}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              Backend Supabase &amp; Matrice RBAC
            </CardTitle>
            <CardDescription>
              Contrôle d&apos;accès basé sur les rôles (Row Level Security).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="font-medium text-slate-700">
                Statut base de données
              </span>
              <Badge variant={isDemoMode ? "indigo" : "emerald"}>
                {isDemoMode
                  ? "Mode Démonstration Interactive"
                  : "Connecté à Supabase PostgreSQL"}
              </Badge>
            </div>

            <div className="space-y-2 text-slate-600">
              <p>
                <strong className="text-slate-900">Admin / Gérant :</strong>{" "}
                Accès total CRUD, validation des caisses/dépenses, facturation B2B,
                gestion des utilisateurs.
              </p>
              <p>
                <strong className="text-slate-900">Manager / Caissier :</strong>{" "}
                Saisie des états de caisse et scan des justificatifs. Ne peut pas
                supprimer les écritures validées.
              </p>
              <p>
                <strong className="text-slate-900">Comptable :</strong> Lecture
                seule sur tous les rapports, factures et pièces + accès complet
                aux exports Excel/ZIP.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste Utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Utilisateurs autorisés ({profiles.length})
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Gérez les rôles et l'activation des comptes."
              : "Vue informative des accès (modification réservée à l'Admin)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {p.full_name}
                  </p>
                  {p.id === currentUserId && (
                    <Badge variant="indigo" className="text-[10px]">
                      Vous
                    </Badge>
                  )}
                  {!p.is_active && (
                    <Badge variant="red" className="text-[10px]">
                      Désactivé
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">{p.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <Select
                      value={p.role}
                      disabled={p.id === currentUserId}
                      onChange={(e) =>
                        handleRoleChange(p.id, e.target.value as UserRole)
                      }
                      className="h-9 w-44 text-xs"
                    >
                      <option value="admin">Admin / Gérant</option>
                      <option value="manager">Manager / Caissier</option>
                      <option value="accountant">Comptable</option>
                    </Select>
                    {p.id !== currentUserId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(p)}
                      >
                        {p.is_active ? "Désactiver" : "Activer"}
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge variant="slate">{getRoleLabel(p.role)}</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal ajout utilisateur */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un membre à l'équipe"
        description="Crée un accès avec rôle attribué dans la table profiles."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nom complet *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              placeholder="Ex: Youssef El Amrani"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse e-mail *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="youssef@tylias.ma"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Rôle RBAC *</Label>
            <Select id="role" name="role" defaultValue="manager">
              <option value="manager">Manager / Caissier</option>
              <option value="accountant">Comptable (Lecture &amp; Export)</option>
              <option value="admin">Admin / Gérant</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe initial *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={6}
              required
              placeholder="6 caractères minimum"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { BanButton } from "@/components/admin/ban-dialog";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/config/auth";
import { setUserRole, unbanUser } from "@/server/moderation/actions";

/**
 * Ban / lift ban for staff, and the role select for admins (SPEC §10 users). The database decides
 * who may act on whom (D-083); this only hides buttons that would certainly fail.
 */
export function UserAdminPanel({
  user,
  viewer,
}: {
  user: { id: string; username: string; role: Role; banned: boolean };
  viewer: { id: string; role: Role };
}) {
  const id = useId();
  const router = useRouter();
  const [role, setRole] = useState<Role>(user.role);
  const [pending, start] = useTransition();
  const self = viewer.id === user.id;
  const canBan = !self && user.role !== "admin" && (user.role !== "mod" || viewer.role === "admin");

  function lift() {
    start(async () => {
      const result = await unbanUser({ userId: user.id });
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  function saveRole() {
    start(async () => {
      const result = await setUserRole({ userId: user.id, role });
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canBan ? (
        <div className="flex flex-wrap gap-2">
          {user.banned ? (
            <Button size="lg" variant="secondary" disabled={pending} onClick={lift}>
              <ShieldOff aria-hidden="true" />
              Lift ban
            </Button>
          ) : (
            <BanButton userId={user.id} username={user.username} label="Ban" variant="destructive" />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {self ? "This is you." : "Only admins can ban moderators, and admins can't be banned."}
        </p>
      )}

      {viewer.role === "admin" && !self ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-role`} className="text-xs font-medium text-muted-foreground">
              Role
            </label>
            <select
              id={`${id}-role`}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="h-10 min-w-40 rounded-[10px] border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" disabled={pending || role === user.role} onClick={saveRole}>
            Change role
          </Button>
        </div>
      ) : null}
    </div>
  );
}

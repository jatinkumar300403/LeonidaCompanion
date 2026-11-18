"use client";

import { Ban, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ReportDialog } from "@/components/forum/report-dialog";
import { Button } from "@/components/ui/button";
import { setBlocked } from "@/server/forum/actions";

/** Report and Block on someone else's profile (SPEC §5 safety: report profiles, block users). */
export function ProfileSafety({ userId, username, blocked }: { userId: string; username: string; blocked: boolean }) {
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2 self-start sm:self-center">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await setBlocked(userId, !blocked);
            if (!result.ok) return void toast.error(result.message);
            toast.success(result.message);
            router.refresh();
          })
        }
      >
        <Ban aria-hidden="true" />
        {blocked ? "Unblock" : "Block"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setReporting(true)}>
        <Flag aria-hidden="true" />
        Report
      </Button>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        targetType="profile"
        targetId={userId}
        what={`@${username}`}
      />
    </div>
  );
}

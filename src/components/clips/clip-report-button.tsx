"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ReportDialog } from "@/components/forum/report-dialog";
import { Button } from "@/components/ui/button";
import { signInPath } from "@/lib/auth/redirect";
import { loadBrowserSupabase } from "@/lib/supabase/browser";

/** "Report" under a clip (SPEC §5 reasons): reports go to the moderation queue (Phase 6). */
export function ClipReportButton({ clipId, returnTo }: { clipId: number; returnTo: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadBrowserSupabase().then(async (supabase) => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (active) setSignedIn(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, []);

  if (signedIn === false) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href={signInPath(returnTo)}>
          <Flag aria-hidden="true" />
          Report
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={signedIn === null}>
        <Flag aria-hidden="true" />
        Report
      </Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="clip" targetId={String(clipId)} what="this clip" />
    </>
  );
}

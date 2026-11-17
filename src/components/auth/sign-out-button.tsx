"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOutAndReload } from "@/lib/supabase/sign-out";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOutAndReload("/", "signed-out");
      }}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
      Sign out
    </Button>
  );
}

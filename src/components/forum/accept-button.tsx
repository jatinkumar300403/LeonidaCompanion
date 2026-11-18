"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAcceptedAnswer } from "@/server/forum/actions";

/** "Accept answer" for the asker or a mod in a Q&A thread (SPEC §5); "Unaccept" on the accepted one. */
export function AcceptButton({ threadId, postId, accepted }: { threadId: number; postId: number; accepted: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={accepted ? "secondary" : "outline"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await setAcceptedAnswer(threadId, accepted ? null : postId);
          if (!result.ok) return void toast.error(result.message);
          toast.success(result.message);
          router.refresh();
        })
      }
    >
      <CircleCheck aria-hidden="true" />
      {pending ? "Saving…" : accepted ? "Unaccept" : "Accept answer"}
    </Button>
  );
}

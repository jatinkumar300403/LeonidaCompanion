"use client";

import { Ban, Ellipsis, Flag, Link2, Pencil, Quote, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePostEdit } from "@/components/forum/post-edit";
import { ReportDialog } from "@/components/forum/report-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePost, deleteThread, setBlocked } from "@/server/forum/actions";

/** Fired by "Quote"; the reply composer listens and inserts the quote. */
export const QUOTE_EVENT = "forum:quote";
export type QuoteDetail = { postId: number | null; username: string | null; bodyMd: string };

/**
 * The "…" menu on a question or reply: Quote, Edit (author within 30 minutes, or staff), Delete,
 * Report, Block and Copy link. Signed-out visitors only get Copy link.
 */
export function PostActions({
  kind,
  id,
  threadId,
  anchor,
  author,
  bodyMd,
  canQuote,
  canEdit,
  canDelete,
  canReport,
  hasReplies = false,
}: {
  kind: "thread" | "post";
  id: number;
  threadId: number;
  anchor: string;
  author: { id: string; username: string } | null;
  bodyMd: string;
  canQuote: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Signed in and not the author: may report and block. */
  canReport: boolean;
  hasReplies?: boolean;
}) {
  const router = useRouter();
  const { startEdit } = usePostEdit();
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "block" | null>(null);
  const [pending, start] = useTransition();
  const label = kind === "thread" ? "question" : "reply";

  function quote() {
    window.dispatchEvent(
      new CustomEvent<QuoteDetail>(QUOTE_EVENT, {
        detail: { postId: kind === "post" ? id : null, username: author?.username ?? null, bodyMd },
      }),
    );
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  function runDelete() {
    start(async () => {
      if (kind === "thread") {
        const result = await deleteThread(threadId);
        if (!result.ok) return void toast.error(result.message);
        toast.success(result.message);
        if (result.url) router.push(result.url);
        else router.refresh();
      } else {
        const result = await deletePost(id);
        if (!result.ok) return void toast.error(result.message);
        toast.success(result.message);
        router.refresh();
      }
      setConfirm(null);
    });
  }

  function runBlock() {
    if (!author) return;
    start(async () => {
      const result = await setBlocked(author.id, true);
      if (!result.ok) return void toast.error(result.message);
      toast.success(result.message);
      setConfirm(null);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label={`More actions for this ${label}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canQuote ? (
            <DropdownMenuItem onSelect={quote}>
              <Quote aria-hidden="true" />
              Quote
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem onSelect={startEdit}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem onSelect={() => setConfirm("delete")} variant="destructive">
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <Link2 aria-hidden="true" />
            Copy link
          </DropdownMenuItem>
          {canReport ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setReporting(true)}>
                <Flag aria-hidden="true" />
                Report
              </DropdownMenuItem>
              {author ? (
                <DropdownMenuItem onSelect={() => setConfirm("block")}>
                  <Ban aria-hidden="true" />
                  Block @{author.username}
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canReport ? (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          targetType={kind}
          targetId={String(kind === "thread" ? threadId : id)}
          what={`this ${label}`}
        />
      ) : null}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => (open ? null : setConfirm(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "block" ? `Block @${author?.username}?` : `Delete this ${label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "block"
                ? "You won't see their threads and replies, and they can't mention or notify you. You can unblock them from their profile."
                : kind === "thread" && hasReplies
                  ? "The question will show “[deleted]”. The replies stay, because they may help others."
                  : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                if (confirm === "block") runBlock();
                else runDelete();
              }}
            >
              {pending ? "Working…" : confirm === "block" ? "Block" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

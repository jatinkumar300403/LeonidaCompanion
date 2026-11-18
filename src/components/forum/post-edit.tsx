"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { TagPicker } from "@/components/forum/tag-picker";
import { FieldError } from "@/components/shared/form-bits";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { THREAD_LIMITS } from "@/lib/forum/rules";
import { editPost, editThread } from "@/server/forum/actions";

/**
 * Inline editing for a question or reply. PostEditProvider wraps one post; the actions menu calls
 * startEdit() and PostBody swaps the rendered markdown (server-rendered children) for an editor.
 */
type EditContext = { editing: boolean; startEdit: () => void; stopEdit: () => void };
const Ctx = createContext<EditContext>({ editing: false, startEdit: () => {}, stopEdit: () => {} });

export function PostEditProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <Ctx.Provider value={{ editing, startEdit: () => setEditing(true), stopEdit: () => setEditing(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePostEdit = () => useContext(Ctx);

export type ThreadEditValues = {
  threadId: number;
  title: string;
  bodyMd: string;
  tags: string[];
  isSpoiler: boolean;
  /** Missions & Story: the spoiler flag is always on. */
  spoilerForced: boolean;
};

export function PostBody({
  children,
  post,
  thread,
}: {
  children: React.ReactNode;
  /** Editing a reply. */
  post?: { id: number; bodyMd: string };
  /** Editing the question. */
  thread?: ThreadEditValues;
}) {
  const { editing } = usePostEdit();
  if (!editing) return <>{children}</>;
  if (thread) return <ThreadEditor values={thread} />;
  if (post) return <PostEditor post={post} />;
  return <>{children}</>;
}

function PostEditor({ post }: { post: { id: number; bodyMd: string } }) {
  const id = useId();
  const router = useRouter();
  const { stopEdit } = usePostEdit();
  const [body, setBody] = useState(post.bodyMd);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await editPost({ postId: post.id, body });
          if (!result.ok) {
            setError(result.fieldErrors?.body ?? result.message);
            return;
          }
          toast.success(result.message);
          stopEdit();
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <MarkdownEditor
        id={`${id}-body`}
        value={body}
        onChange={setBody}
        youtube={false}
        mentions
        compact
        label="Edit your reply"
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
      />
      <FieldError id={`${id}-error`} message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={stopEdit} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ThreadEditor({ values }: { values: ThreadEditValues }) {
  const id = useId();
  const router = useRouter();
  const { stopEdit } = usePostEdit();
  const [title, setTitle] = useState(values.title);
  const [body, setBody] = useState(values.bodyMd);
  const [tags, setTags] = useState(values.tags);
  const [spoiler, setSpoiler] = useState(values.isSpoiler || values.spoilerForced);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await editThread({ threadId: values.threadId, title, body, tags, isSpoiler: spoiler });
          if (!result.ok) {
            setErrors(result.fieldErrors ?? {});
            setMessage(result.message);
            return;
          }
          toast.success(result.message);
          stopEdit();
          router.replace(result.url, { scroll: false });
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Input
          id={`${id}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={THREAD_LIMITS.titleMax}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        <FieldError id={`${id}-title-error`} message={errors.title} />
      </div>
      <div className="space-y-2">
        <MarkdownEditor
          id={`${id}-body`}
          value={body}
          onChange={setBody}
          youtube={false}
          mentions
          compact
          label="Question"
          invalid={Boolean(errors.body)}
          describedBy={errors.body ? `${id}-body-error` : undefined}
        />
        <FieldError id={`${id}-body-error`} message={errors.body} />
      </div>
      <div className="space-y-2">
        <p id={`${id}-tags`} className="text-sm font-medium">
          Tags
        </p>
        <TagPicker value={tags} onChange={setTags} labelledBy={`${id}-tags`} />
      </div>
      <div className="flex items-center gap-3">
        <Switch id={`${id}-spoiler`} checked={spoiler} onCheckedChange={setSpoiler} disabled={values.spoilerForced} />
        <Label htmlFor={`${id}-spoiler`}>Contains story spoilers</Label>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={stopEdit} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

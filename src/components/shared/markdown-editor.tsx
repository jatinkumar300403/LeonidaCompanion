"use client";

import {
  Bold,
  Clapperboard,
  EyeOff,
  Heading2,
  Heading3,
  Italic,
  Lightbulb,
  Link2,
  List,
  Quote,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/**
 * MarkdownEditor (SPEC §2): a plain textarea with a toolbar and a live preview tab. Mobile-friendly:
 * the toolbar scrolls sideways and every button is a 40px target. The preview uses the same
 * MarkdownRenderer as the public page, so what you see is what gets published.
 */
type Action = { label: string; icon: LucideIcon; apply: (selected: string) => { text: string; block?: boolean } };

const ACTIONS: Action[] = [
  { label: "Heading", icon: Heading2, apply: (s) => ({ text: `## ${s || "Heading"}`, block: true }) },
  { label: "Subheading", icon: Heading3, apply: (s) => ({ text: `### ${s || "Subheading"}`, block: true }) },
  { label: "Bold", icon: Bold, apply: (s) => ({ text: `**${s || "bold text"}**` }) },
  { label: "Italic", icon: Italic, apply: (s) => ({ text: `*${s || "italic text"}*` }) },
  { label: "Link", icon: Link2, apply: (s) => ({ text: `[${s || "link text"}](https://)` }) },
  {
    label: "List",
    icon: List,
    apply: (s) => ({
      text: (s || "First item\nSecond item")
        .split("\n")
        .map((l) => `- ${l}`)
        .join("\n"),
      block: true,
    }),
  },
  { label: "Quote", icon: Quote, apply: (s) => ({ text: `> ${s || "Quote"}`, block: true }) },
  {
    label: "Tip callout",
    icon: Lightbulb,
    apply: (s) => ({ text: `> [!TIP]\n> ${s || "A useful tip."}`, block: true }),
  },
  {
    label: "Warning callout",
    icon: TriangleAlert,
    apply: (s) => ({ text: `> [!WARNING]\n> ${s || "Watch out for this."}`, block: true }),
  },
  { label: "Spoiler", icon: EyeOff, apply: (s) => ({ text: `||${s || "spoiler"}||` }) },
  { label: "YouTube video", icon: Clapperboard, apply: () => ({ text: "::youtube[VIDEO_ID_11]", block: true }) },
];

export function MarkdownEditor({
  id,
  value,
  onChange,
  rows = 16,
  placeholder,
  invalid,
  describedBy,
  youtube = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  youtube?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function run(action: Action) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const { text, block } = action.apply(selected);
    let before = value.slice(0, start);
    const after = value.slice(end);
    if (block && before && !before.endsWith("\n\n")) before += before.endsWith("\n") ? "\n" : "\n\n";
    const next = `${before}${text}${block && after && !after.startsWith("\n") ? "\n\n" : ""}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.length + text.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <Tabs defaultValue="write" className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="write" className="mt-2">
        <div
          role="toolbar"
          aria-label="Formatting"
          aria-controls={id}
          className="flex gap-1 overflow-x-auto rounded-t-[10px] border border-b-0 border-input bg-surface-2 p-1"
        >
          {ACTIONS.filter((action) => youtube || action.label !== "YouTube video").map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => run(action)}
              aria-label={action.label}
              title={action.label}
              className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <action.icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <Textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="min-h-72 rounded-t-none font-mono text-sm leading-relaxed"
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div className="min-h-72 rounded-[10px] border bg-card p-4 sm:p-6">
          {value.trim() ? (
            <MarkdownRenderer source={value} youtube={youtube} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

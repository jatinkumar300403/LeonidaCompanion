import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Error text under a field; give the input `aria-describedby={id}` and `aria-invalid`. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

const noticeStyles = {
  error: {
    icon: AlertCircle,
    className: "border-destructive/40 bg-destructive/10 text-foreground",
    iconClass: "text-destructive",
  },
  success: { icon: CheckCircle2, className: "border-teal/40 bg-teal/10 text-foreground", iconClass: "text-teal-text" },
  info: { icon: Info, className: "border-border bg-surface-2 text-foreground", iconClass: "text-muted-foreground" },
} as const;

/** A short message box. Errors use role="alert" so screen readers announce them. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof noticeStyles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const style = noticeStyles[tone];
  const Icon = style.icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", style.className, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClass)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}

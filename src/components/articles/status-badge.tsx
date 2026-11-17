import { BadgeCheck, CircleCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FACT_STATUSES, type FactStatus } from "@/config/tags";

/** confirmed = teal, verified = violet, community = orange (SPEC §2, CLAUDE.md rule 7). */
const STYLES = {
  confirmed: { variant: "teal", icon: CircleCheck },
  verified: { variant: "violet", icon: BadgeCheck },
  community: { variant: "orange", icon: Users },
} as const;

export function StatusBadge({
  status,
  withTooltip = false,
  className,
}: {
  status: FactStatus;
  /** Adds a focusable tooltip explaining what the status means. */
  withTooltip?: boolean;
  className?: string;
}) {
  const { variant, icon: Icon } = STYLES[status];
  const { label, description } = FACT_STATUSES[status];
  const badge = (
    <Badge variant={variant} className={className} tabIndex={withTooltip ? 0 : undefined}>
      <Icon aria-hidden="true" />
      {label}
      {withTooltip ? null : <span className="sr-only">: {description}</span>}
    </Badge>
  );

  if (!withTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

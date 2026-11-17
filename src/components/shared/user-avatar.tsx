import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Initials from the display name, else the username. */
export function initials(displayName: string | null | undefined, username: string): string {
  const source = displayName?.trim() || username;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

/** A user's avatar with an initials fallback on the dusk gradient. */
export function UserAvatar({
  username,
  displayName,
  avatarUrl,
  size = "default",
  className,
  fallbackClassName,
}: {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Initials size for large avatars, e.g. "text-2xl". */
  fallbackClassName?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className={cn("bg-dusk font-semibold text-on-accent", fallbackClassName)}>
        {initials(displayName, username)}
      </AvatarFallback>
    </Avatar>
  );
}

import { Wrench } from "lucide-react";
import { getFlags } from "@/server/flags";

/**
 * Site-wide notice while MAINTENANCE_MODE is on (D-086). Reads the cached flags, so it doesn't make
 * pages dynamic; it appears within the flags cache window (instantly after a save on the server).
 */
export async function MaintenanceBanner() {
  const flags = await getFlags();
  if (!flags.MAINTENANCE_MODE) return null;
  return (
    <div role="status" className="border-b border-orange/30 bg-orange/12">
      <p className="page-container flex items-start gap-2 py-2.5 text-sm">
        <Wrench className="mt-0.5 size-4 shrink-0 text-orange-text" aria-hidden="true" />
        <span>
          <span className="font-semibold">Maintenance in progress.</span> Posting is paused for a little while.
          Everything else works as usual.
        </span>
      </p>
    </div>
  );
}

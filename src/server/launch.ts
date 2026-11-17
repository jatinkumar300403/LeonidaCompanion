import "server-only";
import { LAUNCH_AT } from "@/config/site";
import { serverLaunchHint } from "@/lib/launch";

/**
 * What CountdownOrStatus can safely render on the server (before the viewer's time zone is
 * known). Read per render, so ISR pages flip to "out" on their next regeneration after launch.
 */
export async function getLaunchHint() {
  return serverLaunchHint(Date.now(), LAUNCH_AT);
}

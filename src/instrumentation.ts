/**
 * Runs once when a Next.js server starts. Loading the env module validates every variable at
 * boot and logs one warning per missing integration (CLAUDE.md: env vars validated at boot).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env");
  }
}

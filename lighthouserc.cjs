/**
 * Lighthouse CI (SPEC §15 quality gates, D-099): mobile scores for /, a tip page, /forum and
 * /clips against a production build. Start it first (`pnpm build && pnpm start`), publish the
 * sample tip on DEV (`pnpm qa:sample-tip publish`), then run `pnpm lhci`.
 * Chromium comes from Playwright, so no separate Chrome install is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- LHCI only reads a CommonJS config file.
const { chromium } = require("@playwright/test");

const base = process.env.LHCI_BASE_URL ?? "http://localhost:3000";
const tip = process.env.LHCI_TIP_PATH ?? "/tips/sample-tip-1";

module.exports = {
  ci: {
    collect: {
      url: ["/", tip, "/forum", "/clips"].map((path) => `${base}${path}`),
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: {
        // Lighthouse's default mobile profile: Moto G-class device, simulated slow 4G.
        chromeFlags: "--headless=new --no-sandbox",
        // Where Lighthouse can't spawn Chrome itself (locked-down Windows shells), start Chromium with
        // --remote-debugging-port and set LHCI_CHROME_PORT: chrome-launcher reuses it.
        ...(process.env.LHCI_CHROME_PORT ? { port: Number(process.env.LHCI_CHROME_PORT) } : {}),
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:best-practices": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};

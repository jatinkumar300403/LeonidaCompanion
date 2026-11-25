import type { Metadata } from "next";
import { NotFoundContent } from "@/components/shared/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** notFound() from a page in this group: the group's layout already draws the shell (D-109). */
export default function NotFound() {
  return <NotFoundContent />;
}

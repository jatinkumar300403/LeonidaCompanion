import Link from "next/link";
import { Camera, Car, Compass, Crosshair, Map, Siren, Smartphone, Users, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { FeatureIcon, FeatureSummary } from "@/types/content";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  car: Car,
  crosshair: Crosshair,
  wallet: Wallet,
  map: Map,
  siren: Siren,
  smartphone: Smartphone,
  users: Users,
  camera: Camera,
  compass: Compass,
};

/** Features Explained card: icon, title, summary (SPEC §2). */
export function FeatureCard({ feature, className }: { feature: FeatureSummary; className?: string }) {
  const Icon = ICONS[feature.icon] ?? Compass;

  return (
    <Card interactive className={cn("p-5", className)}>
      <article className="flex h-full flex-col">
        <div className="grid size-11 place-items-center rounded-lg border border-orange/30 bg-orange/12 text-orange-text">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-lg leading-snug font-semibold">
          <Link href={routes.feature(feature.slug)} className="after:absolute after:inset-0 focus-visible:outline-none">
            {feature.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{feature.summary}</p>
      </article>
    </Card>
  );
}

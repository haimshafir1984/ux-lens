import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "critical" | "warning" | "good";

const byVariant: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        byVariant[variant],
        className
      )}
      {...props}
    />
  );
}

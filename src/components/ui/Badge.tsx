import type { ReactNode } from "react";
export function Badge({
  variant,
  children,
}: {
  variant: "accent" | "neutral" | "error" | "primary" | "warning";
  children: ReactNode;
}) {
  return <span className={"badge badge-" + variant}>{children}</span>;
}

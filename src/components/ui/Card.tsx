import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-xl2 border border-border bg-panel p-4 sm:p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx("font-sora text-sm font-bold text-text mb-1", className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardSubtitle({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-xs text-muted leading-relaxed", className)} {...rest}>
      {children}
    </p>
  );
}

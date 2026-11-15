import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...rest }, ref) => (
    <select
      ref={ref}
      className={clsx(
        "w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent",
        className
      )}
      {...rest}
    />
  )
);
Select.displayName = "Select";

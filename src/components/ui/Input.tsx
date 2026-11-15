import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent",
        className
      )}
      {...rest}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-y",
        className
      )}
      {...rest}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={clsx("mb-1.5 block text-xs font-semibold text-muted", className)}>{children}</label>;
}

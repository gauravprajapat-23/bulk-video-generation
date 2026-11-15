import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-border py-14 px-6 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <div>
        <p className="font-sora text-sm font-bold text-text">{title}</p>
        {description && <p className="mt-1 text-xs text-muted max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

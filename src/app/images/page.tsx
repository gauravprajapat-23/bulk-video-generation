"use client";

import { BulkImageEditor } from "@/components/images/BulkImageEditor";
import { useHasHydrated } from "@/hooks/useHasHydrated";

function LoadingSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-[#080A0F]">
      {/* Tool rail skeleton */}
      <div className="w-16 border-r border-border/50 bg-panel/50 p-2">
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-10 animate-pulse rounded-lg bg-panel2/50" />
          ))}
        </div>
      </div>
      
      {/* Left panel skeleton */}
      <div className="w-72 border-r border-border/50 bg-panel/30 p-4">
        <div className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-panel2/50" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-panel2/30" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Canvas area skeleton */}
      <div className="flex-1 flex items-center justify-center bg-[#090B10]">
        <div className="h-[600px] w-[337px] animate-pulse rounded-lg bg-panel2/20 ring-1 ring-white/5" />
      </div>
      
      {/* Right panel skeleton */}
      <div className="w-72 border-l border-border/50 bg-panel/30 p-4">
        <div className="space-y-4">
          <div className="h-6 w-24 animate-pulse rounded bg-panel2/50" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-panel2/30" />
                <div className="h-8 animate-pulse rounded bg-panel2/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulkImagesPage() {
  const hasHydrated = useHasHydrated();
  if (!hasHydrated) return <LoadingSkeleton />;
  return <BulkImageEditor />;
}

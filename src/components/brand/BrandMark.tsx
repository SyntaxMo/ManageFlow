import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Show wordmark next to the logo */
  showWordmark?: boolean;
  /** Logo size in pixels */
  size?: number;
  /** Light text for dark sidebars */
  inverted?: boolean;
  /**
   * `filled` — blue square sakura (sidebar / login)
   * `outline` — navy line sakura (light top bar)
   */
  variant?: "filled" | "outline";
}

export function BrandMark({
  className,
  showWordmark = true,
  size = 36,
  inverted = false,
  variant = "filled",
}: BrandMarkProps) {
  // Always keep the blue filled mark on dark/blue backgrounds
  const useOutline = variant === "outline" && !inverted;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={useOutline ? "/brand/skra-logo-outline.png" : "/brand/skra-logo.png"}
        alt="SKRA"
        width={size}
        height={size}
        className={cn(
          "block shrink-0",
          useOutline ? "object-contain" : "rounded-[10px] object-cover"
        )}
        priority
      />
      {showWordmark && (
        <span
          className={cn(
            // Italic brand fonts sit optically high — nudge down for true vertical center
            "font-brand block truncate text-sm leading-none tracking-[0.06em] translate-y-[0.12em]",
            inverted ? "text-white" : "text-primary"
          )}
        >
          SKRA
        </span>
      )}
    </span>
  );
}

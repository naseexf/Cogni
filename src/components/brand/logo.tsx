import { cognilearnLogoUrl } from "@/lib/logo";
import { cn } from "@/lib/utils";

export function CogniLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={cognilearnLogoUrl}
        alt="CogniLearn"
        className="h-8 w-8 object-contain"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          Cogni<span className="brand-text-gradient">Learn</span>
        </span>
      )}
    </div>
  );
}

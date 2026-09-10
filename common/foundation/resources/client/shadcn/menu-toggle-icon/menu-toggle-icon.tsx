import {cn} from "@ui/utils/cn";
import {MenuIcon, XIcon} from "lucide-react";

type MenuToggleIconProps = {
  open: boolean;
  className?: string;
  duration?: number;
};

export function MenuToggleIcon({open, className, duration = 300}: MenuToggleIconProps) {
  return (
    <div className={cn("relative size-5", className)} style={{transitionDuration: `${duration}ms`}}>
      <MenuIcon
        className={cn(
          "absolute inset-0 size-5 transition-all",
          open ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
        )}
        style={{transitionDuration: `${duration}ms`}}
      />
      <XIcon
        className={cn(
          "absolute inset-0 size-5 transition-all",
          open ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 -rotate-90"
        )}
        style={{transitionDuration: `${duration}ms`}}
      />
    </div>
  );
}

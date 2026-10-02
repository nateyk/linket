"use client";

import {useState, type CSSProperties} from "react";
import {motion} from "framer-motion";
import {Home, LineChart, CreditCard, MessageCircle, Trophy, User} from "lucide-react";
import {cn} from "@ui/utils/cn";
import {message} from "@ui/i18n/message";
import {useTrans} from "@ui/i18n/use-trans";

const navItems = [
  {label: "Home", icon: Home},
  {label: "Portfolio", icon: LineChart},
  {label: "Transactions", icon: CreditCard},
  {label: "Messages", icon: MessageCircle},
  {label: "Rewards", icon: Trophy},
  {label: "Profile", icon: User},
];

const MOBILE_LABEL_WIDTH = 72;

type NavItem = {label: string; icon: React.ComponentType<{size?: number; strokeWidth?: number; className?: string}>};

type BottomNavBarProps = {
  className?: string;
  defaultIndex?: number;
  stickyBottom?: boolean;
  items?: NavItem[];
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  /**
   * Radius class for the nav container and its buttons. Defaults to the theme's
   * button radius so the bar respects the creator's "Corner roundness" choice.
   */
  radius?: string;
  /**
   * Resolved appearance button design for the ACTIVE nav button. When provided,
   * the active button renders the creator's button design (fill/text/border via
   * CSS vars) instead of the default theme chrome. Absent, the theme chrome is
   * unchanged.
   */
  activeButtonClassName?: string;
  activeButtonStyle?: CSSProperties;
};

export function BottomNavBar({
  className,
  defaultIndex = 0,
  stickyBottom = false,
  items = navItems,
  activeIndex: controlledIndex,
  onIndexChange,
  radius = "rounded-button",
  activeButtonClassName,
  activeButtonStyle,
}: BottomNavBarProps) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = controlledIndex ?? internalIndex;
  const {trans} = useTrans();
  const setActiveIndex = (idx: number) => {
    if (onIndexChange) onIndexChange(idx);
    else setInternalIndex(idx);
  };

  return (
    <motion.nav
      initial={{scale: 0.9, opacity: 0}}
      animate={{scale: 1, opacity: 1}}
      transition={{type: "spring", stiffness: 300, damping: 26}}
      role="navigation"
      aria-label={trans(message("Bottom Navigation"))}
      className={cn(
        "bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 border border-border/40 dark:border-border/50 flex items-center p-1.5 shadow-lg shadow-black/5 ring-1 ring-foreground/5 gap-1 max-w-[95vw] h-[52px] w-fit min-w-0",
        radius,
        stickyBottom && "fixed inset-x-0 bottom-4 mx-auto z-20",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{scale: 0.97}}
            className={cn(
              "flex items-center gap-0 px-3 py-2 transition-all duration-200 relative h-10 min-w-[44px] min-h-[40px] max-h-[44px] font-medium",
              radius,
              isActive
                ? cn(
                    "shadow-sm gap-2",
                    activeButtonClassName ??
                      "bg-primary text-primary-foreground",
                  )
                : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            style={isActive ? activeButtonStyle : undefined}
            onClick={() => setActiveIndex(idx)}
            aria-label={item.label}
            aria-pressed={isActive}
            type="button"
          >
            <Icon
              size={20}
              strokeWidth={2}
              aria-hidden
              className="transition-colors duration-200 shrink-0"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "8px" : "0px",
              }}
              transition={{
                width: {type: "spring", stiffness: 350, damping: 32},
                opacity: {duration: 0.19},
                marginLeft: {duration: 0.19},
              }}
              className="overflow-hidden flex items-center max-w-[72px]"
            >
              <span
                className={cn(
                  "font-semibold text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis leading-[1.9]",
                  isActive
                    ? (activeButtonClassName
                      ? "text-[var(--biolink-button-text)]"
                      : "text-primary-foreground")
                    : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;

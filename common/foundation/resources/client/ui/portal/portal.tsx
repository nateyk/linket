import {ReactNode, useEffect, useState} from "react";
import {createPortal} from "react-dom";

export function Portal({children, className}: {children: ReactNode; className?: string}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className={className ? `fixed inset-0 z-50 ${className}` : "fixed inset-0 z-50"}>
      {children}
    </div>,
    document.body
  );
}

export function PortalBackdrop({onClick}: {onClick?: () => void}) {
  return <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClick} />;
}

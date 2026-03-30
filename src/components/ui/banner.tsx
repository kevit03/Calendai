"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const bannerVariants = cva("relative overflow-hidden border-b text-sm", {
  variants: {
    variant: {
      default: "bg-transparent border-muted/80 text-slate-800",
      success: "bg-transparent border-green-300 text-green-900",
      warning: "bg-transparent border-amber-300 text-amber-900",
      info: "bg-transparent border-blue-300 text-blue-900",
      premium: "bg-transparent border-violet-300 text-violet-900",
      gradient: "bg-transparent border-slate-300 text-slate-900"
    },
    size: {
      default: "py-3 px-0",
      sm: "text-xs py-2 px-0",
      lg: "text-lg py-4 px-0"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});

type BannerProps = React.ComponentProps<"div"> &
  VariantProps<typeof bannerVariants> & {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    showShade?: boolean;
    show?: boolean;
    onHide?: () => void;
    action?: React.ReactNode;
    closable?: boolean;
    autoHide?: number;
  };

export function Banner({
  variant = "default",
  size = "default",
  title,
  description,
  icon,
  showShade = false,
  show,
  onHide,
  action,
  closable = false,
  className,
  autoHide,
  ...props
}: BannerProps) {
  React.useEffect(() => {
    if (!autoHide || !show) {
      return;
    }

    const timer = window.setTimeout(() => onHide?.(), autoHide);
    return () => window.clearTimeout(timer);
  }, [autoHide, onHide, show]);

  if (!show) {
    return null;
  }

  return (
    <div
      className={cn(bannerVariants({ variant, size }), className)}
      role={variant === "warning" || variant === "default" ? "alert" : "status"}
      {...props}
    >
      {showShade && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-current/20" />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{title}</p>
            {description && <p className="text-xs opacity-80">{description}</p>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {action}
          {closable && (
            <Button onClick={onHide} size="icon" variant="ghost" type="button">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

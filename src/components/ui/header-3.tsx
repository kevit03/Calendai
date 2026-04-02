"use client";

import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { MenuToggleIcon } from "./menu-toggle-icon";

export type AppPage = "connections" | "composer" | "activity" | "blog" | "patch-notes";

const navItems: Array<{ id: AppPage; label: string }> = [
  { id: "connections", label: "Connections" },
  { id: "composer", label: "New event" },
  { id: "activity", label: "Latest update" },
  { id: "blog", label: "Blog" },
  { id: "patch-notes", label: "Patch notes" }
];

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false);
  const onScroll = React.useCallback(() => setScrolled(window.scrollY > threshold), [threshold]);

  React.useEffect(() => {
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return scrolled;
}

function MobileMenu({
  open,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { open: boolean }) {
  if (!open || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 top-16 z-40 flex border-y bg-background/95 backdrop-blur-lg md:hidden">
      <div className={cn("size-full overflow-y-auto p-4", className)} {...props}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function WordmarkIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 84 24" fill="currentColor" {...props}>
      <path d="M45.035 23.984c-1.34-.062-2.566-.441-3.777-1.16-1.938-1.152-3.465-3.187-4.02-5.36-.199-.784-.238-1.128-.234-2.058 0-.691.008-.87.062-1.207.23-1.5.852-2.883 1.852-4.144.297-.371 1.023-1.09 1.41-1.387 1.399-1.082 2.84-1.68 4.406-1.816.536-.047 1.528-.02 2.047.054 1.227.184 2.227.543 3.106 1.121 1.277.84 2.5 2.184 3.367 3.7.098.168.172.308.172.312-.004 0-1.047.723-2.32 1.598l-2.711 1.867c-.61.422-2.91 2.008-2.993 2.062l-.074.047-1-1.574c-.55-.867-1.008-1.594-1.012-1.61-.007-.019.922-.648 2.188-1.476 1.215-.793 2.2-1.453 2.191-1.46-.02-.032-.508-.27-.691-.34a5 5 0 0 0-.465-.13c-.371-.09-1.105-.125-1.426-.07-1.285.219-2.336 1.3-2.777 2.852-.215.761-.242 1.636-.074 2.355.129.527.383 1.102.691 1.543.234.332.727.82 1.047 1.031.664.434 1.195.586 1.969.555.613-.023 1.027-.129 1.64-.426 1.184-.574 2.16-1.554 2.828-2.843.122-.235.208-.372.227-.368.082.032 3.77 1.938 3.79 1.961.034.032-.407.93-.696 1.414a12 12 0 0 1-1.051 1.477c-.36.422-1.102 1.14-1.492 1.445a9.9 9.9 0 0 1-3.23 1.684 9.2 9.2 0 0 1-2.95.351" />
    </svg>
  );
}

export function Header({
  currentPage,
  onNavigate
}: {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleNavigate = (page: AppPage) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-transparent", scrolled && "border-border bg-background/80 backdrop-blur-xl")}>
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <button type="button" onClick={() => handleNavigate("composer")} className="p-2 hover:bg-accent/40">
          <WordmarkIcon className="h-4 text-[#1a73e8]" />
        </button>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={currentPage === item.id ? "default" : "ghost"}
              onClick={() => handleNavigate(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      <MobileMenu open={open} className="flex flex-col gap-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavigate(item.id)}
            className={cn(
              "border-b py-3 text-left text-sm font-medium",
              currentPage === item.id ? "border-[#1a73e8] text-[#1a73e8]" : "border-slate-200 text-slate-800"
            )}
          >
            {item.label}
          </button>
        ))}
      </MobileMenu>
    </header>
  );
}

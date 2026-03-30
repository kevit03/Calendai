"use client";

import React from "react";
import { createPortal } from "react-dom";
import { CalendarCheck2, CalendarDays, FileText, PlugIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { MenuToggleIcon } from "./menu-toggle-icon";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "./navigation-menu";

type LinkItem = {
  title: string;
  href: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  description?: string;
};

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

function ListItem({
  title,
  description,
  icon: Icon,
  className,
  href,
  ...props
}: React.ComponentProps<typeof NavigationMenuLink> & LinkItem) {
  return (
    <NavigationMenuLink
      className={cn("flex w-full flex-row gap-x-3 p-3 transition-colors hover:bg-accent hover:text-accent-foreground", className)}
      {...props}
      asChild
    >
      <a href={href}>
        <div className="flex size-10 items-center justify-center border-b border-slate-300">
          <Icon className="size-4 text-foreground" />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="font-medium">{title}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      </a>
    </NavigationMenuLink>
  );
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

const productLinks: LinkItem[] = [
  { title: "Connections", href: "#connections", description: "Link Google and manage account state", icon: PlugIcon },
  { title: "AI Drafting", href: "#composer", description: "Turn plain English into event drafts", icon: Sparkles },
  { title: "Review", href: "#review", description: "Check titles, times, attendees, and notes", icon: FileText },
  { title: "Schedule", href: "#activity", description: "Open your Google Calendar after updates", icon: CalendarDays }
];

function WordmarkIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 84 24" fill="currentColor" {...props}>
      <path d="M45.035 23.984c-1.34-.062-2.566-.441-3.777-1.16-1.938-1.152-3.465-3.187-4.02-5.36-.199-.784-.238-1.128-.234-2.058 0-.691.008-.87.062-1.207.23-1.5.852-2.883 1.852-4.144.297-.371 1.023-1.09 1.41-1.387 1.399-1.082 2.84-1.68 4.406-1.816.536-.047 1.528-.02 2.047.054 1.227.184 2.227.543 3.106 1.121 1.277.84 2.5 2.184 3.367 3.7.098.168.172.308.172.312-.004 0-1.047.723-2.32 1.598l-2.711 1.867c-.61.422-2.91 2.008-2.993 2.062l-.074.047-1-1.574c-.55-.867-1.008-1.594-1.012-1.61-.007-.019.922-.648 2.188-1.476 1.215-.793 2.2-1.453 2.191-1.46-.02-.032-.508-.27-.691-.34a5 5 0 0 0-.465-.13c-.371-.09-1.105-.125-1.426-.07-1.285.219-2.336 1.3-2.777 2.852-.215.761-.242 1.636-.074 2.355.129.527.383 1.102.691 1.543.234.332.727.82 1.047 1.031.664.434 1.195.586 1.969.555.613-.023 1.027-.129 1.64-.426 1.184-.574 2.16-1.554 2.828-2.843.122-.235.208-.372.227-.368.082.032 3.77 1.938 3.79 1.961.034.032-.407.93-.696 1.414a12 12 0 0 1-1.051 1.477c-.36.422-1.102 1.14-1.492 1.445a9.9 9.9 0 0 1-3.23 1.684 9.2 9.2 0 0 1-2.95.351" />
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-transparent", scrolled && "border-border bg-background/80 backdrop-blur-xl")}>
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <a href="#top" className="p-2 hover:bg-accent/40">
            <WordmarkIcon className="h-4 text-[#1a73e8]" />
          </a>
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Navigate</NavigationMenuTrigger>
                <NavigationMenuContent className="p-2">
                  <ul className="grid w-[520px] grid-cols-2 gap-2 border bg-white p-2 shadow-calendar-card">
                    {productLinks.map((item) => (
                      <li key={item.title}>
                        <ListItem {...item} />
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuLink className="px-4" asChild>
                <a href="#review" className="p-2 hover:bg-accent">
                  Review
                </a>
              </NavigationMenuLink>
              <NavigationMenuLink className="px-4" asChild>
                <a href="#activity" className="p-2 hover:bg-accent">
                  Activity
                </a>
              </NavigationMenuLink>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" asChild>
            <a href="#connections">Connections</a>
          </Button>
          <Button asChild>
            <a href="#composer">New event</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="#activity">Latest update</a>
          </Button>
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

      <MobileMenu open={open} className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          {productLinks.map((item) => (
            <ListItem key={item.title} {...item} />
          ))}
          <a href="#review" className="border-b border-slate-200 py-3 text-sm font-medium text-slate-800">
            <span className="inline-flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4" />
              Review event details
            </span>
          </a>
          <a href="#activity" className="border-b border-slate-200 py-3 text-sm font-medium text-slate-800">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Latest update
            </span>
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full bg-transparent" asChild>
            <a href="#connections">Connections</a>
          </Button>
          <Button className="w-full" asChild>
            <a href="#composer">Create event</a>
          </Button>
        </div>
      </MobileMenu>
    </header>
  );
}

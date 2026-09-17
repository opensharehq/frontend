import { Globe2, LogIn, User, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

interface MobileMenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuLabel: string;
  loginLabel: string;
  profileLabel: string;
  internationalSiteLabel?: string;
  internationalSiteUrl?: string;
  isAuthenticated: boolean;
  username?: string;
  items: MobileMenuItem[];
}

export function MobileMenuSheet({
  open,
  onOpenChange,
  menuLabel,
  loginLabel,
  profileLabel,
  internationalSiteLabel,
  internationalSiteUrl,
  isAuthenticated,
  username,
  items,
}: MobileMenuSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(88vw,22rem)] px-0 pb-5 pt-[env(safe-area-inset-top)]">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center text-sm">
            <img src="/logo-with-text.png" alt="OpenShare" className="h-7" draggable={false} />
          </SheetTitle>
        </SheetHeader>

        <nav className="px-3 py-2" aria-label={menuLabel}>
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <SheetClose asChild>
                    <Link
                      to={item.to}
                      className="flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-border hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto space-y-2 border-t border-border px-3 pt-4">
          {internationalSiteLabel && internationalSiteUrl && (
            <SheetClose asChild>
              <a
                href={internationalSiteUrl}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card/70 px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{internationalSiteLabel}</span>
              </a>
            </SheetClose>
          )}
          {isAuthenticated ? (
            <SheetClose asChild>
              <Link
                to="/profile"
                className="flex min-h-11 items-center gap-3 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{username || profileLabel}</span>
              </Link>
            </SheetClose>
          ) : (
            <Button className="w-full justify-start" asChild>
              <SheetClose asChild>
                <Link to="/login">
                  <LogIn className="size-4" strokeWidth={1.5} aria-hidden="true" />
                  {loginLabel}
                </Link>
              </SheetClose>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BarChart3, Menu, Radar, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { LanguageToggle } from "@/app/components/language-toggle";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { useLanguage } from "@/app/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";

const MobileMenuSheet = lazy(() =>
  import("@/app/components/mobile-menu-sheet").then((module) => ({
    default: module.MobileMenuSheet,
  })),
);

export function Header() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedMobileMenuRef = useRef(false);
  const mobileNavItems = [
    { label: t("nav.insight"), to: "/insight", icon: BarChart3 },
    { label: t("nav.talentReach"), to: "/talent-reach", icon: Radar },
    { label: t("nav.points"), to: "/points", icon: Wallet },
  ];

  useEffect(() => {
    if (mobileMenuOpen) {
      hasOpenedMobileMenuRef.current = true;
      return;
    }
    if (hasOpenedMobileMenuRef.current) {
      menuButtonRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/75 bg-background/92 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1624px] px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-secondary/55 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo-with-text.png"
              alt="OpenShare"
              className="h-8"
              draggable={false}
            />
          </Link>

          <nav className="ml-10 mr-auto hidden items-center gap-1 md:flex" aria-label={t("header.menu")}>
            {mobileNavItems.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-secondary/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to="/profile"
                title={user?.username || 'User'}
                aria-label="个人中心"
                className="hidden size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring md:flex"
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Link>
            ) : (
              <Button variant="ghost" className="hidden md:inline-flex" asChild>
                <Link to="/login">{t("header.login")}</Link>
              </Button>
            )}
            <LanguageToggle iconOnly />
            <ThemeToggle />
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("header.openMenu")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </Button>
            {mobileMenuOpen && (
              <Suspense fallback={null}>
                <MobileMenuSheet
                  open={mobileMenuOpen}
                  onOpenChange={setMobileMenuOpen}
                  menuLabel={t("header.menu")}
                  loginLabel={t("header.login")}
                  profileLabel={t("nav.profile")}
                  isAuthenticated={isAuthenticated}
                  username={user?.username}
                  items={mobileNavItems}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

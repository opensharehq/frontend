import { useLanguage } from "@/app/contexts/language-context";
import { HOMEPAGE_PLATFORMS } from "@/app/homepage-config";

export function PlatformsSection() {
  const { t } = useLanguage();

  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("platforms.subtitle")}
            </p>
            <h2 className="mt-2 text-balance text-xl font-semibold text-foreground sm:text-2xl">
              {t("platforms.title")}
            </h2>
          </div>
          <p className="max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
            {t("platforms.description")}
          </p>
        </div>

        <div className="grid overflow-hidden rounded-xl border border-border bg-card/35 sm:grid-cols-5">
          {HOMEPAGE_PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              title={t("platforms.visitWebsite", { name: platform.name })}
              className="group flex min-h-24 items-center gap-3 border-b border-border px-4 py-4 outline-none transition-colors hover:bg-secondary/45 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background p-2 transition-[border-color,background-color] duration-150 group-hover:border-primary/40">
                <img
                  src={`https://oss.open-digger.cn/logos/${platform.logo}.png`}
                  alt=""
                  className="size-7 object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{platform.name}</span>
                <span className="mt-1 block truncate font-mono text-[10px] uppercase text-muted-foreground">
                  {platform.signal}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

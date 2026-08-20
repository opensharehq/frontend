import {
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/language-context";

const GLOBAL_OPEN_SOURCE_REPORT_URL =
  "https://open-digger.cn/en/blog/2026-07-23-global-open-source-development-report";
const CHINA_OPEN_SOURCE_REPORT_URL =
  "https://kaiyuanshe.github.io/2025-China-Open-Source-Report/";

export function ReportsSection() {
  const { t } = useLanguage();
  const reports = [
    {
      icon: Globe,
      title: t("reports.global.title"),
      year: t("reports.global.year"),
      description: t("reports.global.description"),
      highlights: [
        t("reports.global.highlight1"),
        t("reports.global.highlight2"),
        t("reports.global.highlight3"),
      ],
      badge: t("reports.global.badge"),
      tone: "text-chart-2",
      href: GLOBAL_OPEN_SOURCE_REPORT_URL,
    },
    {
      icon: Award,
      title: t("reports.china.title"),
      year: t("reports.china.year"),
      description: t("reports.china.description"),
      highlights: [
        t("reports.china.highlight1"),
        t("reports.china.highlight2"),
        t("reports.china.highlight3"),
      ],
      badge: t("reports.china.badge"),
      tone: "text-primary",
      href: CHINA_OPEN_SOURCE_REPORT_URL,
    },
    {
      icon: TrendingUp,
      title: t("reports.talent.title"),
      year: t("reports.talent.year"),
      description: t("reports.talent.description"),
      highlights: [
        t("reports.talent.highlight1"),
        t("reports.talent.highlight2"),
        t("reports.talent.highlight3"),
      ],
      badge: t("reports.talent.badge"),
      tone: "text-chart-4",
      href: undefined,
    },
  ];
  const [featuredReport, ...supportingReports] = reports;
  const stats = [
    { value: t("reports.stat1.value"), label: t("reports.stat1"), icon: FileText },
    { value: t("reports.stat2.value"), label: t("reports.stat2"), icon: Building2 },
    { value: t("reports.stat3.value"), label: t("reports.stat3"), icon: Landmark },
    { value: t("reports.stat4.value"), label: t("reports.stat4"), icon: Download },
  ];

  return (
    <section id="reports" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <div className="mb-6 inline-flex h-8 items-center gap-2 rounded-full border border-chart-4/25 bg-chart-4/10 px-3">
            <BadgeCheck className="size-4 text-chart-4" strokeWidth={1.5} />
            <span className="text-sm font-medium text-chart-4">{t("reports.badge")}</span>
          </div>
          <h2 className="mb-4 max-w-3xl text-balance text-3xl font-semibold text-foreground md:text-4xl">
            {t("reports.title")}
          </h2>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            {t("reports.description")}
          </p>
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="size-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
              <span>{t("reports.badge")}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {featuredReport.year}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <a
              href={featuredReport.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border border-border bg-background/80 p-6 outline-none transition-colors hover:border-chart-2/55 focus-visible:ring-2 focus-visible:ring-ring lg:col-span-3"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex h-7 items-center rounded-full border border-primary/25 bg-primary/10 px-3 text-xs font-medium text-primary">
                  {featuredReport.badge}
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-sm text-muted-foreground tabular-nums">
                  {featuredReport.year}
                  <ExternalLink
                    className="size-4 transition-colors group-hover:text-chart-2"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
              </div>

              <div className="mb-5 flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card/70">
                  <Globe className={`size-6 ${featuredReport.tone}`} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-semibold leading-8 text-foreground md:text-3xl">
                    {featuredReport.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
                    {featuredReport.description}
                  </p>
                </div>
              </div>

              <ul className="mt-7 flex flex-wrap gap-2">
                {featuredReport.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card/40 px-3 text-sm text-muted-foreground"
                  >
                    <BadgeCheck className="size-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </a>

            <div className="space-y-3 lg:col-span-2">
              {supportingReports.map((report) => {
                const Icon = report.icon;
                const reportContent = (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/70">
                          <Icon className={`size-5 ${report.tone}`} strokeWidth={1.5} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-medium text-primary">{report.badge}</span>
                      </div>
                      <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
                        {report.year}
                        {report.href && (
                          <ExternalLink
                            className="size-3.5 transition-colors group-hover:text-primary"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold leading-6 text-foreground">
                      {report.title}
                    </h3>
                    <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
                      {report.description}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {report.highlights.map((highlight) => (
                        <li key={highlight} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/35 px-2.5 py-1 text-xs text-muted-foreground">
                          <span className={`size-1.5 rounded-full bg-current ${report.tone}`} aria-hidden="true" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </>
                );

                if (report.href) {
                  return (
                    <a
                      key={report.title}
                      href={report.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg border border-border bg-background/65 p-4 outline-none transition-colors hover:border-primary/55 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {reportContent}
                    </a>
                  );
                }

                return (
                  <article key={report.title} className="rounded-lg border border-border bg-background/65 p-4">
                    {reportContent}
                  </article>
                );
              })}
            </div>
          </div>

          <dl className="mt-8 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className="min-w-0">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Icon className="size-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    <dt>{stat.label}</dt>
                  </div>
                  <dd className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                    {stat.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

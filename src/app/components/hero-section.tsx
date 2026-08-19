import { Activity, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/app/contexts/language-context";
import { SiteSearchBox } from "@/app/components/site-search-box";
import { ContributionWafer } from "@/app/components/contribution-wafer";
import {
  HOMEPAGE_PLATFORMS,
  HOMEPAGE_POPULAR_LABEL_IDS,
  HOMEPAGE_WAFER_PROJECTS,
} from "@/app/homepage-config";
import { getLabelDetailPath } from "@/pages/insight/domain/routes";

export function HeroSection() {
  const { t } = useLanguage();
  const popularProjects = HOMEPAGE_POPULAR_LABEL_IDS.map((labelId) =>
    HOMEPAGE_WAFER_PROJECTS.find((project) => project.labelId === labelId),
  ).filter((project): project is NonNullable<typeof project> => Boolean(project));

  return (
    <section className="homepage-hero">
      <div className="homepage-hero__layout">
        <div className="homepage-hero__copy">
          <div className="homepage-hero__kicker">
            <Activity className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            <span>{t("hero.kicker")}</span>
          </div>
          <h1 className="homepage-hero__title">
            <span>{t("hero.title.line1")}</span>
            <br />
            <span>{t("hero.title.line2")}</span>
          </h1>

          <p className="homepage-hero__description">
            {t("hero.description")}
          </p>

          <div className="homepage-hero__search">
            <SiteSearchBox variant="landing" />
          </div>

          <div className="homepage-popular-searches" aria-label={t("hero.popular.title")}>
            <span className="homepage-popular-searches__label">
              <GitBranch className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              {t("hero.popular.title")}
            </span>
            {popularProjects.map((project) => (
              <Link
                key={project.labelId}
                to={getLabelDetailPath(project.labelId)}
                className="homepage-popular-searches__item"
              >
                {project.fallbackName}
              </Link>
            ))}
          </div>

          <div className="homepage-platform-strip">
            <p>{t("platforms.subtitle")}</p>
            <div className="homepage-platform-strip__items">
              {HOMEPAGE_PLATFORMS.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("platforms.visitWebsite", { name: platform.name })}
                >
                  <span className="homepage-platform-strip__logo">
                    <img
                      src={`https://oss.open-digger.cn/logos/${platform.logo}.png`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </span>
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>
          </div>

          <dl className="homepage-hero-stats">
            <div>
              <dt>{t("hero.stats.platforms")}</dt>
              <dd>5</dd>
            </div>
            <div>
              <dt>{t("hero.stats.developers")}</dt>
              <dd>{t("hero.stats.developers.count")}</dd>
            </div>
            <div>
              <dt>{t("hero.stats.projects")}</dt>
              <dd>{t("hero.stats.projects.count")}</dd>
            </div>
          </dl>
        </div>

        <ContributionWafer />
      </div>
    </section>
  );
}

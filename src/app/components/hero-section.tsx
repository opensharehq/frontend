import { GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/app/contexts/language-context";
import { SiteSearchBox } from "@/app/components/site-search-box";
import { ContributionWafer } from "@/app/components/contribution-wafer";
import {
  HOMEPAGE_PLATFORMS,
  HOMEPAGE_POPULAR_SEARCHES,
} from "@/app/homepage-config";
import { getLabelDetailPath } from "@/pages/insight/domain/routes";

export function HeroSection() {
  const { t, language } = useLanguage();

  return (
    <section className={`homepage-hero ${language.startsWith("en") ? "homepage-hero--en" : "homepage-hero--zh"}`}>
      <div className="homepage-hero__layout">
        <div className="homepage-hero__copy">
          <div className="homepage-hero__heading">
            <h1 className="homepage-hero__title">
              <span>{t("hero.title.line1")}</span>
              <br />
              <span>{t("hero.title.line2")}</span>
            </h1>
          </div>

          <div className="homepage-hero__story">
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
              {HOMEPAGE_POPULAR_SEARCHES.map((project) => (
                <Link
                  key={project.labelId}
                  to={getLabelDetailPath(project.labelId)}
                  className="homepage-popular-searches__item"
                >
                  {project.fallbackName}
                </Link>
              ))}
            </div>
          </div>

          <div className="homepage-hero__evidence">
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
                <dd>{HOMEPAGE_PLATFORMS.length}</dd>
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
        </div>

        <ContributionWafer />
      </div>
    </section>
  );
}

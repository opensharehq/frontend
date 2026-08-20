import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  CircleDot,
  Radar,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { HOMEPAGE_WAFER_PROJECTS } from "@/app/homepage-config";
import { fetchHomepageProject, type HomepageProjectData } from "@/app/homepage-data";
import { useLanguage } from "@/app/contexts/language-context";
import { getLabelDetailPath } from "@/pages/insight/domain/routes";

const WAFER_COLUMNS = 44;
const WAFER_ROWS = 26;
const WAFER_CELL_COUNT = WAFER_COLUMNS * WAFER_ROWS;

function isInsideCluster(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): boolean {
  return ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 <= 1;
}

function getWaferCellTone(index: number): string {
  const column = index % WAFER_COLUMNS;
  const row = Math.floor(index / WAFER_COLUMNS);
  const x = column / (WAFER_COLUMNS - 1);
  const y = row / (WAFER_ROWS - 1);
  const seed = (column * 47 + row * 71 + column * row * 11 + (column ^ row) * 13) % 101;

  const isTealCluster =
    (isInsideCluster(x, y, 0.57, 0.49, 0.15, 0.29) ||
      isInsideCluster(x, y, 0.76, 0.61, 0.13, 0.22) ||
      isInsideCluster(x, y, 0.87, 0.72, 0.07, 0.11)) &&
    seed >= 27;
  const isBlueCluster =
    (isInsideCluster(x, y, 0.27, 0.29, 0.14, 0.2) ||
      isInsideCluster(x, y, 0.61, 0.2, 0.19, 0.11) ||
      isInsideCluster(x, y, 0.43, 0.81, 0.15, 0.16) ||
      isInsideCluster(x, y, 0.75, 0.45, 0.08, 0.17)) &&
    seed >= 34;
  const isAmberCluster =
    (isInsideCluster(x, y, 0.25, 0.68, 0.14, 0.17) ||
      isInsideCluster(x, y, 0.78, 0.28, 0.13, 0.15) ||
      isInsideCluster(x, y, 0.68, 0.74, 0.08, 0.12)) &&
    seed >= 41;

  const variant = seed % 13 <= 1 ? "bright" : seed % 7 <= 1 ? "soft" : "mid";

  if (isTealCluster) return `teal-${variant}`;
  if (isBlueCluster) return `blue-${variant}`;
  if (isAmberCluster) return `amber-${variant}`;
  if (seed === 7 || seed === 19 || seed === 83) return "blue-soft";
  if (seed % 17 === 0) return "idle-lit";
  if (seed % 11 === 0) return "idle-deep";
  return "idle";
}

function formatMetric(value: number | null, locale: string): string {
  if (value == null) return "--";
  return new Intl.NumberFormat(locale, {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function ProjectAvatar({ project }: { project: HomepageProjectData }) {
  const [failed, setFailed] = useState(false);
  if (!project.avatar || failed) {
    return (
      <span className="homepage-wafer-project__avatar homepage-wafer-project__avatar--fallback" aria-hidden="true">
        {project.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="homepage-wafer-project__avatar" aria-hidden="true">
      <img
        src={project.avatar}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export function ContributionWafer() {
  const { t, language } = useLanguage();
  const locale = language === "zh" ? "zh-CN" : "en-US";
  const initialProjects = useMemo<HomepageProjectData[]>(
    () =>
      HOMEPAGE_WAFER_PROJECTS.map((project) => ({
        ...project,
        name: project.fallbackName,
        nameZh: "",
        avatar: "",
        openrank: null,
        activity: null,
        participants: null,
      })),
    [],
  );
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(
      HOMEPAGE_WAFER_PROJECTS.map((project) => fetchHomepageProject(project, controller.signal)),
    ).then((nextProjects) => {
      if (!controller.signal.aborted) setProjects(nextProjects);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setProjects(initialProjects);
      }
    });
    return () => controller.abort();
  }, [initialProjects]);

  return (
    <div className="homepage-wafer-shell" aria-label={t("hero.wafer.ariaLabel")}>
      <div className="homepage-wafer-frame">
        <div className="homepage-wafer-base" aria-hidden="true">
          <span />
        </div>

        <div className="homepage-wafer" role="img" aria-label={t("hero.wafer.description")}>
          <div className="homepage-wafer-grid" aria-hidden="true">
            {Array.from({ length: WAFER_CELL_COUNT }, (_, index) => (
              <span
                key={index}
                className={`homepage-wafer-cell homepage-wafer-cell--${getWaferCellTone(index)}`}
              />
            ))}
          </div>

          <svg className="homepage-wafer-routes" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            <path className="route route--teal" d="M22 190 H205 L264 244 H532 V102 H662 V238 H790 V320 H978" />
            <path className="route route--blue" d="M24 354 H170 L226 410 H355 V292 H505 V430 H630 V245 H814 L864 194 H978" />
            <path className="route route--amber" d="M20 292 H191 L252 351 H334 V240 H462 V388 H565 V330 H745 L803 378 H978" />
            {["205,190", "264,244", "532,102", "662,238", "790,320"].map((point) => {
              const [cx, cy] = point.split(",");
              return <circle key={`teal-${point}`} cx={cx} cy={cy} r="4" className="route-node route-node--teal" />;
            })}
            {["170,354", "226,410", "355,292", "505,430", "630,245", "814,194"].map((point) => {
              const [cx, cy] = point.split(",");
              return <circle key={`blue-${point}`} cx={cx} cy={cy} r="4" className="route-node route-node--blue" />;
            })}
            {["191,292", "252,351", "334,240", "462,388", "565,330", "745,330"].map((point) => {
              const [cx, cy] = point.split(",");
              return <circle key={`amber-${point}`} cx={cx} cy={cy} r="4" className="route-node route-node--amber" />;
            })}
            <circle cx="565" cy="330" r="13" className="route-core" />
          </svg>
        </div>

        <div className="homepage-wafer-projects">
          {projects.map((project) => {
            const displayName = language === "zh" && project.nameZh ? project.nameZh : project.name;
            const labelPath = project.labelId.replace(/^:/, "").replace(/_/g, "/");
            return (
              <Link
                key={project.labelId}
                to={getLabelDetailPath(project.labelId)}
                className={`homepage-wafer-project homepage-wafer-project--${project.accent}`}
                style={{ left: `${project.position.x}%`, top: `${project.position.y}%` }}
                aria-label={`${displayName}, OpenRank ${formatMetric(project.openrank, locale)}, ${t("hero.wafer.participants")} ${formatMetric(project.participants, locale)}`}
              >
                <span className="homepage-wafer-project__title">
                  <ProjectAvatar project={project} />
                  <span>{displayName}</span>
                </span>
                <span className="homepage-wafer-project__path">{labelPath}</span>
                <span className="homepage-wafer-project__metrics">
                  <span>
                    <Star className="size-3" strokeWidth={1.5} aria-hidden="true" />
                    {formatMetric(project.openrank, locale)}
                  </span>
                  <span>
                    <Users className="size-3" strokeWidth={1.5} aria-hidden="true" />
                    {formatMetric(project.participants, locale)}
                  </span>
                </span>
              </Link>
            );
          })}

          <div className="homepage-wafer-core" aria-hidden="true">
            <CircleDot className="size-5" strokeWidth={1.5} />
            <span>{t("hero.wafer.core")}</span>
          </div>
        </div>

        <div className="homepage-wafer-axis" aria-hidden="true">
          <span>OPENRANK</span>
          <span>ACTIVITY</span>
          <span>PARTICIPANTS</span>
        </div>

        {["top", "left", "right", "bottom-left", "bottom-right"].map((position) => (
          <span
            key={position}
            className={`homepage-wafer-person homepage-wafer-person--${position}`}
            aria-hidden="true"
          >
            <UserRound className="size-4" strokeWidth={1.6} />
          </span>
        ))}
      </div>

      <nav className="homepage-wafer-products" aria-label={t("products.badge")}>
        <Link to="/insight" className="homepage-wafer-product homepage-wafer-product--teal">
          <span className="homepage-wafer-product__icon">
            <BarChart3 className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="homepage-wafer-product__copy">
            <strong>{t("products.insight.name")}</strong>
            <small>{t("products.insight.subtitle")}</small>
          </span>
          <ArrowRight className="homepage-wafer-product__arrow" strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link to="/talent-reach" className="homepage-wafer-product homepage-wafer-product--amber">
          <span className="homepage-wafer-product__icon">
            <Radar className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="homepage-wafer-product__copy">
            <strong>{t("products.ads.name")}</strong>
            <small>{t("products.ads.subtitle")}</small>
          </span>
          <ArrowRight className="homepage-wafer-product__arrow" strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <Link to="/points" className="homepage-wafer-product homepage-wafer-product--blue">
          <span className="homepage-wafer-product__icon">
            <Award className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="homepage-wafer-product__copy">
            <strong>{t("products.credit.name")}</strong>
            <small>{t("products.credit.subtitle")}</small>
          </span>
          <ArrowRight className="homepage-wafer-product__arrow" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}

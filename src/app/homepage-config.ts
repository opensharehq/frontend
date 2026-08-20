export type HomepageAccent = "teal" | "blue" | "amber";

export interface HomepageProjectConfig {
  /** Canonical OpenDigger label id. Keep the leading ':' for easy replacement. */
  labelId: `:${string}`;
  fallbackName: string;
  accent: HomepageAccent;
  position: { x: number; y: number };
}

export interface HomepagePopularSearchConfig {
  /** Canonical OpenDigger label id. Keep the leading ':' for easy replacement. */
  labelId: `:${string}`;
  fallbackName: string;
}

export interface HomepagePlatformConfig {
  name: string;
  logo: string;
  url: string;
  signal: string;
}

/**
 * Projects rendered on the homepage wafer.
 *
 * OpenDigger data path convention:
 *   :companies/huawei/cann -> https://oss.open-digger.cn/companies/huawei/cann/*
 *
 * Change labelId/fallbackName or reorder entries to update the wafer without
 * touching the rendering component.
 */
export const HOMEPAGE_WAFER_PROJECTS: HomepageProjectConfig[] = [
  { labelId: ":companies/huawei/cann", fallbackName: "CANN", accent: "teal", position: { x: 25, y: 23 } },
  { labelId: ":projects/openclaw", fallbackName: "OpenClaw", accent: "blue", position: { x: 49, y: 15 } },
  { labelId: ":universities/illinois/llvm", fallbackName: "LLVM", accent: "amber", position: { x: 72, y: 24 } },
  { labelId: ":companies/meta/pytorch", fallbackName: "PyTorch", accent: "blue", position: { x: 17, y: 48 } },
  { labelId: ":companies/mozilla/rust", fallbackName: "Rust", accent: "teal", position: { x: 43, y: 43 } },
  { labelId: ":companies/microsoft/vscode", fallbackName: "VS Code", accent: "amber", position: { x: 69, y: 48 } },
  { labelId: ":companies/odoo/odoo", fallbackName: "Odoo", accent: "teal", position: { x: 28, y: 70 } },
  { labelId: ":companies/yandex/clickhouse", fallbackName: "ClickHouse", accent: "blue", position: { x: 54, y: 72 } },
];

/** Search shortcuts shown below the landing-page search input. */
export const HOMEPAGE_POPULAR_SEARCHES: HomepagePopularSearchConfig[] = [
  { labelId: ":technology/agentic_ai", fallbackName: "Agentic AI" },
  { labelId: ":projects/openclaw", fallbackName: "OpenClaw" },
  { labelId: ":companies/microsoft", fallbackName: "Microsoft" },
  { labelId: ":companies/odoo/odoo", fallbackName: "Odoo" },
  { labelId: ":companies/yandex/clickhouse", fallbackName: "ClickHouse" },
];

/** Keep this list aligned with the five data sources on the existing homepage. */
export const HOMEPAGE_PLATFORMS: HomepagePlatformConfig[] = [
  { name: "GitHub", logo: "github", url: "https://github.com", signal: "code/repo" },
  { name: "GitLab", logo: "gitlab", url: "https://gitlab.com", signal: "merge/issue" },
  { name: "Gitee", logo: "gitee", url: "https://gitee.com", signal: "cn/ecosystem" },
  { name: "AtomGit", logo: "atomgit", url: "https://atomgit.com", signal: "project/hub" },
  { name: "HuggingFace", logo: "huggingface", url: "https://huggingface.co", signal: "model/dataset" },
];

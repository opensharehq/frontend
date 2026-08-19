export type HomepageAccent = "teal" | "blue" | "amber";

export interface HomepageProjectConfig {
  /** Canonical OpenDigger label id. Keep the leading ':' for easy replacement. */
  labelId: `:${string}`;
  fallbackName: string;
  accent: HomepageAccent;
  position: { x: number; y: number };
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
 *   :projects/ollama -> https://oss.open-digger.cn/projects/ollama/*
 *
 * Change labelId/fallbackName or reorder entries to update the wafer without
 * touching the rendering component.
 */
export const HOMEPAGE_WAFER_PROJECTS: HomepageProjectConfig[] = [
  { labelId: ":projects/ollama", fallbackName: "Ollama", accent: "teal", position: { x: 25, y: 23 } },
  { labelId: ":projects/vllm", fallbackName: "vLLM", accent: "blue", position: { x: 49, y: 15 } },
  { labelId: ":projects/svelte", fallbackName: "Svelte", accent: "amber", position: { x: 72, y: 24 } },
  { labelId: ":projects/systemd", fallbackName: "systemd", accent: "blue", position: { x: 17, y: 48 } },
  { labelId: ":projects/comfyui", fallbackName: "ComfyUI", accent: "teal", position: { x: 43, y: 43 } },
  { labelId: ":projects/ray", fallbackName: "Ray", accent: "amber", position: { x: 69, y: 48 } },
  { labelId: ":projects/bioconda", fallbackName: "Bioconda", accent: "teal", position: { x: 28, y: 70 } },
  { labelId: ":projects/the_algorithms", fallbackName: "The Algorithms", accent: "blue", position: { x: 54, y: 72 } },
  { labelId: ":projects/zigbee2mqtt", fallbackName: "Zigbee2MQTT", accent: "amber", position: { x: 78, y: 68 } },
];

/** Search shortcuts shown below the landing-page search input. */
export const HOMEPAGE_POPULAR_LABEL_IDS: HomepageProjectConfig["labelId"][] = [
  ":projects/ollama",
  ":projects/vllm",
  ":projects/comfyui",
  ":projects/ray",
  ":projects/svelte",
];

/** Keep this list aligned with the five data sources on the existing homepage. */
export const HOMEPAGE_PLATFORMS: HomepagePlatformConfig[] = [
  { name: "GitHub", logo: "github", url: "https://github.com", signal: "code/repo" },
  { name: "GitLab", logo: "gitlab", url: "https://gitlab.com", signal: "merge/issue" },
  { name: "Gitee", logo: "gitee", url: "https://gitee.com", signal: "cn/ecosystem" },
  { name: "AtomGit", logo: "atomgit", url: "https://atomgit.com", signal: "project/hub" },
  { name: "HuggingFace", logo: "huggingface", url: "https://huggingface.co", signal: "model/dataset" },
];

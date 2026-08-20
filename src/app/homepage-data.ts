import { TREND_DATA_BASE } from "@/pages/insight/api/constants";
import type { HomepageProjectConfig } from "@/app/homepage-config";

type MetricNumber = number | string;
type MetricJson = Record<
  string,
  MetricNumber | { value?: MetricNumber; openrank?: MetricNumber } | null | undefined
>;

const METRIC_KEY_COLLATOR = new Intl.Collator("en", { numeric: true });

interface LabelMetaJson {
  name?: string;
  name_zh?: string;
  avatar?: string;
  logo?: string;
}

export interface HomepageProjectData extends HomepageProjectConfig {
  name: string;
  nameZh: string;
  avatar: string;
  openrank: number | null;
  activity: number | null;
  participants: number | null;
}

export function stripOpenDiggerLabelPrefix(labelId: string): string {
  return labelId.replace(/^[:#]/, "").replace(/^\/+/, "");
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function getLatestMetricValue(data: MetricJson | null | undefined): number | null {
  if (!data || typeof data !== "object") return null;
  const sortedKeys = Object.keys(data).sort(METRIC_KEY_COLLATOR.compare).reverse();
  for (const key of sortedKeys) {
    const rawValue = data[key];
    const directValue = toFiniteNumber(rawValue);
    if (directValue != null) return directValue;
    if (rawValue && typeof rawValue === "object") {
      const nestedValue = toFiniteNumber(rawValue.value) ?? toFiniteNumber(rawValue.openrank);
      if (nestedValue != null) return nestedValue;
    }
  }
  return null;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}

export async function fetchHomepageProject(
  config: HomepageProjectConfig,
  signal?: AbortSignal,
): Promise<HomepageProjectData> {
  const labelPath = stripOpenDiggerLabelPrefix(config.labelId);
  const baseUrl = `${TREND_DATA_BASE}${labelPath}/`;
  const [meta, openrank, activity, participants] = await Promise.all([
    fetchJson<LabelMetaJson>(`${baseUrl}meta.json`, signal),
    fetchJson<MetricJson>(`${baseUrl}openrank.json`, signal),
    fetchJson<MetricJson>(`${baseUrl}activity.json`, signal),
    fetchJson<MetricJson>(`${baseUrl}participants.json`, signal),
  ]);

  return {
    ...config,
    name: meta?.name || config.fallbackName,
    nameZh: meta?.name_zh || "",
    avatar: meta?.avatar || meta?.logo || `${TREND_DATA_BASE}logos/${labelPath}.png`,
    openrank: getLatestMetricValue(openrank),
    activity: getLatestMetricValue(activity),
    participants: getLatestMetricValue(participants),
  };
}

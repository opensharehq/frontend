import { TREND_DATA_BASE } from "@/pages/insight/api/constants";
import type { HomepageProjectConfig } from "@/app/homepage-config";

type MetricJson = Record<string, number | { value?: number; openrank?: number } | null | undefined>;

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

export function getLatestMetricValue(data: MetricJson | null | undefined): number | null {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const rawValue = entries[index]?.[1];
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue;
    if (rawValue && typeof rawValue === "object") {
      const nestedValue = rawValue.value ?? rawValue.openrank;
      if (typeof nestedValue === "number" && Number.isFinite(nestedValue)) return nestedValue;
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

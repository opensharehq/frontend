// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getLatestMetricValue, stripOpenDiggerLabelPrefix } from "@/app/homepage-data";

describe("homepage OpenDigger data helpers", () => {
  it("normalizes canonical label ids to OSS paths", () => {
    expect(stripOpenDiggerLabelPrefix(":projects/ollama")).toBe("projects/ollama");
    expect(stripOpenDiggerLabelPrefix("#projects/vllm")).toBe("projects/vllm");
  });

  it("reads the newest finite metric value", () => {
    expect(getLatestMetricValue({ "2026Q1": 12, "2026Q2": 18.25 })).toBe(18.25);
    expect(getLatestMetricValue({ "2026Q1": { value: 9 }, "2026Q2": { openrank: 14 } })).toBe(14);
    expect(getLatestMetricValue({ "2026Q1": null })).toBeNull();
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getLatestMetricValue, stripOpenDiggerLabelPrefix } from "@/app/homepage-data";

describe("homepage OpenDigger data helpers", () => {
  it("normalizes canonical label ids to OSS paths", () => {
    expect(stripOpenDiggerLabelPrefix(":projects/ollama")).toBe("projects/ollama");
    expect(stripOpenDiggerLabelPrefix("#projects/vllm")).toBe("projects/vllm");
    expect(stripOpenDiggerLabelPrefix(":technology/agentic_ai")).toBe("technology/agentic_ai");
  });

  it("sorts metric periods before reading the newest finite value", () => {
    expect(getLatestMetricValue({ "2026Q2": 18.25, "2026Q1": 12 })).toBe(18.25);
    expect(getLatestMetricValue({ "2026-10": 21, "2026-9": 17 })).toBe(21);
    expect(getLatestMetricValue({ "2026Q1": { value: 9 }, "2026Q2": { openrank: 14 } })).toBe(14);
    expect(getLatestMetricValue({ "2026Q1": null })).toBeNull();
  });

  it("coerces finite numeric strings and skips invalid latest values", () => {
    expect(getLatestMetricValue({ "2026Q1": "12.5", "2026Q2": { value: "18.25" } })).toBe(18.25);
    expect(getLatestMetricValue({ "2026Q1": { openrank: "14" }, "2026Q2": "not-a-number" })).toBe(14);
    expect(getLatestMetricValue({ "2026Q1": "" })).toBeNull();
  });
});

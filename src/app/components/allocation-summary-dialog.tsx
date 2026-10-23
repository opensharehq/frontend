import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { getApiError } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { inferLabelAvatarUrl } from "@/pages/insight/domain/repoPlatform";
import { TREND_DATA_BASE } from "@/pages/insight/api/constants";

/**
 * 远端 OSS meta.json 缓存. 指向单个标签的并发请求会被去重,
 * 避免同一弹窗打开多个同名标签时重复拉取.
 */
const LABEL_META_CACHE = new Map<
  string,
  Promise<{ name?: string; name_zh?: string; avatar?: string } | null>
>();

function stripLabelPrefix(labelId: string): string {
  if (labelId.startsWith(":") || labelId.startsWith("#")) {
    return labelId.slice(1);
  }
  return labelId;
}

async function fetchLabelMetaCached(
  labelId: string,
): Promise<{ name?: string; name_zh?: string; avatar?: string } | null> {
  const cached = LABEL_META_CACHE.get(labelId);
  if (cached) return cached;
  const promise = (async () => {
    const slicedId = stripLabelPrefix(labelId);
    if (!slicedId) return null;
    try {
      const res = await fetch(`${TREND_DATA_BASE}${slicedId}/meta.json`);
      if (!res.ok) return null;
      const json = (await res.json()) as Record<string, unknown>;
      return {
        name: typeof json.name === "string" ? json.name : undefined,
        name_zh:
          typeof json.name_zh === "string" ? json.name_zh : undefined,
        avatar:
          (typeof json.avatar === "string" ? json.avatar : undefined) ??
          (typeof json.logo === "string" ? json.logo : undefined),
      };
    } catch {
      return null;
    }
  })();
  LABEL_META_CACHE.set(labelId, promise);
  return promise;
}

function LabelChip({ labelId }: { labelId: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [meta, setMeta] = useState<{
    name?: string;
    name_zh?: string;
    avatar?: string;
  } | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoFailed(false);
    void fetchLabelMetaCached(labelId).then((result) => {
      if (!cancelled) setMeta(result);
    });
    return () => {
      cancelled = true;
    };
  }, [labelId]);

  const inferredLogo = inferLabelAvatarUrl(labelId);
  const logo = meta?.avatar || inferredLogo;
  const displayName =
    lang === "zh"
      ? meta?.name_zh || meta?.name || stripLabelPrefix(labelId)
      : meta?.name || meta?.name_zh || stripLabelPrefix(labelId);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs shadow-sm"
      title={labelId}
    >
      {logo && !logoFailed && (
        <img
          src={logo}
          alt={displayName}
          className="size-4 rounded-full object-cover shrink-0"
          onError={() => setLogoFailed(true)}
        />
      )}
      <span className="font-medium">{displayName}</span>
    </span>
  );
}

interface SourcePoolInfo {
  owner_type: "user" | "organization";
  owner_slug: string | null;
  owner_name: string;
  point_type: "cash" | "gift";
  tag: { slug: string; name: string } | null;
}

interface ScopeData {
  tags?: string[];
  operation?: string;
}

interface AllocationSummary {
  id: number;
  note?: string;
  status: string;
  source_pool: SourcePoolInfo;
  project_scope: ScopeData | null;
  user_scope: ScopeData | null;
  start_month: string;
  end_month: string;
  adjustment_ratio: number;
  created_at: string;
  executed_at: string | null;
}

interface AllocationSummaryDialogProps {
  allocationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "draft":
    case "previewing":
      return "outline";
    default:
      return "secondary";
  }
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{value}</div>
    </div>
  );
}

function TagList({
  tags,
  emptyLabel,
}: {
  tags: string[] | undefined;
  emptyLabel: string;
}) {
  if (!tags || tags.length === 0) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <LabelChip key={tag} labelId={tag} />
      ))}
    </div>
  );
}

export default function AllocationSummaryDialog({
  allocationId,
  open,
  onOpenChange,
}: AllocationSummaryDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AllocationSummary | null>(null);

  const fetchSummary = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const { data } = await api.get<AllocationSummary>(
          `/points/allocations/${id}/summary`,
        );
        setSummary(data);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t("allocationSummary.loadFailed"), {
          description: apiErr.message,
        });
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    },
    [t, onOpenChange],
  );

  useEffect(() => {
    if (open && allocationId != null) {
      setSummary(null);
      fetchSummary(allocationId);
    }
  }, [open, allocationId, fetchSummary]);

  const statusLabel = summary
    ? t(`allocationDetail.status.${summary.status}`, {
        defaultValue: summary.status,
      })
    : "";

  const poolTypeLabel = summary
    ? summary.source_pool.point_type === "cash"
      ? t("transactions.cash")
      : t("transactions.gift")
    : "";

  const poolOwnerLabel = summary
    ? summary.source_pool.owner_type === "organization"
      ? t("allocationSummary.orgPool", { name: summary.source_pool.owner_name })
      : t("allocationSummary.personalPool", {
          name: summary.source_pool.owner_name,
        })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {summary
              ? t("allocationSummary.titleWithId", { id: summary.id })
              : t("allocationSummary.title")}
          </DialogTitle>
          <DialogDescription>
            {t("allocationSummary.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !summary ? (
          <p className="text-center text-muted-foreground py-16">
            {t("allocationSummary.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {summary.note && (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-2">{t('pointAllocation.noteLabel')}</div>
                <p className="text-sm break-all">{summary.note}</p>
              </div>
            )}
            {/* 来源积分池 */}
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">
                {t("allocationSummary.sourcePool")}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{poolOwnerLabel}</span>
                <Badge
                  variant={
                    summary.source_pool.point_type === "cash"
                      ? "default"
                      : "secondary"
                  }
                >
                  {poolTypeLabel}
                </Badge>
                {summary.source_pool.tag && (
                  <Badge variant="outline">
                    {summary.source_pool.tag.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* 项目范围标签 (紧跟积分池下方, 使用标签详情页同样的 logo + name/name_zh 呈现) */}
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {t("allocationSummary.projectScopeTags")}
              </div>
              <TagList
                tags={summary.project_scope?.tags}
                emptyLabel={t("allocationSummary.noTags")}
              />
            </div>

            {/* 用户范围标签（如果有） */}
            {summary.user_scope && (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  {t("allocationSummary.userScopeTags")}
                </div>
                <TagList
                  tags={summary.user_scope?.tags}
                  emptyLabel={t("allocationSummary.noTags")}
                />
              </div>
            )}

            {/* 概要信息 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-md border p-3">
              <InfoItem
                label={t("allocationDetail.status.label")}
                value={
                  <Badge variant={statusBadgeVariant(summary.status)}>
                    {statusLabel}
                  </Badge>
                }
              />
              <InfoItem
                label={t("allocationDetail.period")}
                value={`${summary.start_month.slice(0, 7)} ~ ${summary.end_month.slice(0, 7)}`}
              />
              <InfoItem
                label={t("allocationDetail.adjustmentRatio")}
                value={`×${summary.adjustment_ratio}`}
              />
              <InfoItem
                label={t("allocationDetail.executedAt")}
                value={
                  summary.executed_at
                    ? format(new Date(summary.executed_at), "yyyy-MM-dd HH:mm")
                    : "-"
                }
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

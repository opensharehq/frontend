import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Coins,
  FolderSearch,
  Calendar,
  Eye,
  CheckCircle,
  Loader2,
  X,
  Search,
  Send,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import api, { getApiError } from "@/lib/api";
import {
  inferLabelAvatarUrl,
  normalizeRepoPlatform,
  getDeveloperProfileUrlByPlatform,
} from "@/pages/insight/domain/repoPlatform";
import { OPEN_DIGGER_PLATFORM_LOGO_BASE } from "@/pages/insight/api/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { MonthPicker } from "@/app/components/ui/month-picker";
import { Label } from "@/app/components/ui/label";
import { Slider } from "@/app/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Separator } from "@/app/components/ui/separator";
import { DataPagination } from "@/app/components/ui/data-pagination";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/app/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { toast } from "sonner";

const PREVIEW_PAGE_SIZE = 10;

// --- Types ---

interface SourceSelector {
  owner_type: "user" | "organization";
  owner_slug: string | null;
  point_type: "cash" | "gift";
  tag_slug: string | null;
}

interface PoolItem {
  owner_type: "user" | "organization";
  owner_name: string;
  owner_slug: string;
  point_type: "cash" | "gift";
  tag: { slug: string; name: string } | null;
  available_balance: number;
  source_selector: SourceSelector;
}

interface TagItem {
  id: string;
  name: string;
  platforms: string[];
  type: string;
  openrank: number;
}

interface PreviewRecipient {
  // 平台无关的通用键（后端已提供）
  user_id?: number | null;
  actor_id: string;
  actor_login: string;

  // 兼容老数据
  github_login?: string;

  email: string;
  is_registered: boolean;
  contribution_score: number;
  // 后端按平台动态返回 `{platform}_login` 字段（github_login / gitee_login 等），
  // 同时附带 `platform` 字段（如 "GitHub" / "Gitee"）。这里收口为可选字段，
  // 渲染时优先取与 platform 对应的 login，缺失时回退到 actor_login。
  platform?: string;
  gitee_login?: string;
  gitlab_login?: string;
  atomgit_login?: string;
}

interface PreviewResponse {
  source_selector: Record<string, unknown>;
  available_balance: number;
  contribution_to_points_ratio: number;
  total_recipients: number;
  preview: PreviewRecipient[];
}

interface AllocationItem {
  actor_id: string;
  actor_login: string;
  platform?: string;
  email: string;
  is_registered: boolean;
  user_id?: number | null;
  contribution_score: number;
  amount: number;
}

interface ExecuteRequestBody {
  source_selector: SourceSelector;
  project_scope: { tags: string[]; operation: string };
  user_scope: null;
  start_month: string;
  end_month: string;
  adjustment_ratio: number;
  total_amount: number;
  allocations: AllocationItem[];
}

interface AllocationResult {
  result: { success: number; pending: number; failed: number; total_points: number };
  allocation: Record<string, unknown>;
}

// --- Helpers ---

function getDefaultMonths() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { start: fmt(twoMonthsAgo), end: fmt(lastMonth) };
}

function getMaxMonth() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
}

// 取贡献者在对应平台上的登录名：优先匹配 `{platform}_login`，回退 actor_login。
function getRecipientLogin(r: PreviewRecipient): string {
  if (r.platform) {
    const p = normalizeRepoPlatform(r.platform);
    const key = `${p}_login` as keyof PreviewRecipient;
    const v = r[key];
    if (typeof v === "string" && v) return v;
  }
  return r.github_login ?? r.actor_login ?? "";
}

function getRecipientKey(r: PreviewRecipient): string {
  return `${r.platform ?? ""}:${r.actor_id ?? ""}`;
}

export default function PointAllocationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Step 1 - Pool selection
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // Step 2 - Project scope. Initial value may be populated from URL params
  // (e.g. when the user clicks "Allocate Points" on a label detail page).
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState<TagItem[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>(() => {
    const id = searchParams.get("tag_id");
    if (!id) return [];
    const name = searchParams.get("tag_name") || id;
    const type = searchParams.get("tag_type") || "";
    const openrankRaw = searchParams.get("tag_openrank");
    const platformsRaw = searchParams.get("tag_platforms");
    return [
      {
        id,
        name,
        type,
        platforms: platformsRaw ? platformsRaw.split(",").filter(Boolean) : [],
        openrank: openrankRaw ? Number(openrankRaw) || 0 : 0,
      },
    ];
  });
  const projectOperation = "AND";

  // Strip preload params from the URL once consumed, so that refreshing or
  // navigating back does not re-add the same tag.
  useEffect(() => {
    if (searchParams.has("tag_id")) {
      const next = new URLSearchParams(searchParams);
      ["tag_id", "tag_name", "tag_type", "tag_openrank", "tag_platforms"].forEach((k) =>
        next.delete(k),
      );
      setSearchParams(next, { replace: true });
    }
    // Run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Step 3 - Time range
  const defaults = getDefaultMonths();
  const [startMonth, setStartMonth] = useState(defaults.start);
  const [endMonth, setEndMonth] = useState(defaults.end);

  // Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [individualAdjustments, setIndividualAdjustments] = useState<Record<string, number>>({});
  const [previewPage, setPreviewPage] = useState(1);

  // Execute
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- Fetch pools ---
  useEffect(() => {
    async function fetchPools() {
      try {
        const { data } = await api.get<{ items: PoolItem[] }>("/points/pools");
        setPools(data.items);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t('pointAllocation.loadPoolFailed'), { description: apiErr.message });
      } finally {
        setPoolsLoading(false);
      }
    }
    fetchPools();
  }, [t]);

  // --- Tag search with debounce ---
  useEffect(() => {
    if (!tagSearchQuery.trim()) {
      setTagSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setTagSearching(true);
      try {
        const { data } = await api.get<{ items: TagItem[] }>(
          `/points/tags/search?q=${encodeURIComponent(tagSearchQuery.trim())}`
        );
        setTagSearchResults(data.items);
      } catch {
        setTagSearchResults([]);
      } finally {
        setTagSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tagSearchQuery, t]);

  // --- Derived ---
  const selectedPool = selectedPoolIndex !== null ? pools[selectedPoolIndex] : null;
  const userPools = pools.filter((p) => p.owner_type === "user");
  const orgPools = pools.filter((p) => p.owner_type === "organization");

  const canPreview =
    selectedPool !== null &&
    selectedPool.available_balance > 0 &&
    selectedTags.length > 0 &&
    startMonth &&
    endMonth;

  // 前端接管积分计算：base_points = contribution_score * contribution_to_points_ratio
  const contributionToPointsRatio = previewData?.contribution_to_points_ratio ?? 300;

  /** 理论积分总量：所有贡献者的 floor(contribution_score * ratio) 之和 */
  const theoreticalTotal = useMemo(() => {
    if (!previewData) return 0;
    return previewData.preview.reduce(
      (sum, r) => sum + Math.floor(r.contribution_score * contributionToPointsRatio),
      0,
    );
  }, [previewData, contributionToPointsRatio]);

  /** 每个贡献者的基础积分（前端计算） */
  const computedBasePoints = useMemo(() => {
    if (!previewData) return new Map<string, number>();
    const map = new Map<string, number>();
    previewData.preview.forEach((r) => {
      const key = getRecipientKey(r);
      map.set(key, Math.floor(r.contribution_score * contributionToPointsRatio));
    });
    return map;
  }, [previewData, contributionToPointsRatio]);

  // 积分池可用余额
  const availableBalance = selectedPool?.available_balance ?? 0;

  // 全局比例（派生自滑块值）
  const globalRatio = theoreticalTotal > 0 ? totalAmount / theoreticalTotal : 1;

  // 使用最大余数法确保非手动调整用户的积分总和 + 手动调整用户的积分总和 = totalAmount
  const effectiveAdjustments = useMemo(() => {
    if (!previewData) {
      return {
        byKey: {} as Record<string, number>,
        total: 0,
        naturalTotal: 0,
        scaled: false,
      };
    }

    // 1. 计算手动调整用户的积分总和
    let manualTotal = 0;
    const manualKeys = new Set<string>();
    previewData.preview.forEach((r) => {
      const key = getRecipientKey(r);
      if (key && individualAdjustments[key] !== undefined) {
        manualTotal += individualAdjustments[key];
        manualKeys.add(key);
      }
    });

    // 2. 剩余可分配 = totalAmount - manualTotal
    const remaining = Math.max(0, totalAmount - manualTotal);

    // 3. 对非手动调整用户按 floor(contribution_score * contributionToPointsRatio * globalRatio) 分配
    //    并使用最大余数法将余数分配，确保总和精确等于 remaining
    const nonManualItems: Array<{ key: string; floored: number; remainder: number; idx: number }> = [];
    let flooredSum = 0;

    previewData.preview.forEach((r, idx) => {
      const key = getRecipientKey(r);
      if (manualKeys.has(key)) return;
      const raw = r.contribution_score * contributionToPointsRatio * globalRatio;
      const floored = Math.floor(raw);
      flooredSum += floored;
      nonManualItems.push({ key, floored, remainder: raw - floored, idx });
    });

    // 最大余数法分配余数
    const gap = remaining - flooredSum;
    if (gap > 0 && nonManualItems.length > 0) {
      nonManualItems.sort((a, b) => b.remainder - a.remainder || a.idx - b.idx);
      for (let i = 0; i < gap && i < nonManualItems.length; i++) {
        nonManualItems[i].floored += 1;
      }
    }

    // 4. 构建结果
    const byKey: Record<string, number> = {};
    nonManualItems.forEach((it) => {
      if (it.key) byKey[it.key] = it.floored;
    });
    previewData.preview.forEach((r) => {
      const key = getRecipientKey(r);
      if (key && manualKeys.has(key)) {
        byKey[key] = individualAdjustments[key];
      }
    });

    const total = Object.values(byKey).reduce((sum, v) => sum + v, 0);
    const naturalTotal = total;
    const scaled = false;
    return { byKey, total, naturalTotal, scaled };
  }, [previewData, totalAmount, globalRatio, individualAdjustments, contributionToPointsRatio]);

  const getAdjustedPoints = useCallback(
    (r: PreviewRecipient) => {
      const key = getRecipientKey(r);
      if (key && effectiveAdjustments.byKey[key] !== undefined) {
        return effectiveAdjustments.byKey[key];
      }
      const bp = computedBasePoints.get(key) ?? 0;
      return Math.floor(bp * globalRatio);
    },
    [effectiveAdjustments, computedBasePoints, globalRatio]
  );

  const totalAdjustedPoints = effectiveAdjustments.total;

  // 实际发放倍率：实际发放积分总额 / 所有开发者计算积分（理论积分）总和。
  // 与滑块设定的 globalRatio 不同——当用户手动调整特定开发者的发放数量时，
  // 实际发放总额会偏离滑块设定值，发放倍率也应随之反映真实结果。
  const actualRatio = theoreticalTotal > 0 ? totalAdjustedPoints / theoreticalTotal : 1;

  const registeredCount = previewData
    ? previewData.preview.filter((r) => r.is_registered).length
    : 0;
  const unregisteredCount = previewData
    ? previewData.preview.filter((r) => !r.is_registered).length
    : 0;
  const paginatedPreviewRecipients = previewData
    ? previewData.preview.slice(
      (previewPage - 1) * PREVIEW_PAGE_SIZE,
      previewPage * PREVIEW_PAGE_SIZE,
    )
    : [];

  // 总积分（effectiveAdjustments.total）在缩放后必然 <= availableBalance，
  // 因此 canExecute 只需判断有受益人即可。
  const canExecute = previewData !== null && totalAdjustedPoints > 0;

  /** 滑块变化处理 */
  const handleSliderChange = useCallback(
    (values: number[]) => {
      const val = values[0] ?? 0;
      setTotalAmount(val);
      setIndividualAdjustments({});
    },
    []
  );

  /**
   * 重置为比例 1：将总量设为 min(理论积分总和, 可用余额)，并清除所有手动调整。
   * “尽可能接近比例 1” —— 在积分池余额充足时为 1.0，不足时为可达到的最大比例。
   */
  const handleResetToRatioOne = useCallback(() => {
    if (!previewData || theoreticalTotal <= 0) return;
    const target = Math.min(theoreticalTotal, availableBalance);
    setTotalAmount(target);
    setIndividualAdjustments({});
  }, [previewData, theoreticalTotal, availableBalance]);

  // --- Actions ---
  /** Preview 请求体：仅包含范围参数，不再发送计算参数 */
  function buildPreviewBody() {
    return {
      source_selector: selectedPool!.source_selector,
      project_scope: {
        tags: selectedTags.map((t) => t.id),
        operation: selectedTags.length >= 2 ? projectOperation : "AND",
      },
      user_scope: null,
      start_month: startMonth + "-01",
      end_month: endMonth + "-01",
    };
  }

  /** Execute 请求体：包含计算结果 allocations 数组 */
  function buildExecuteBody(): ExecuteRequestBody {
    const allocations: AllocationItem[] = previewData!.preview.map((r) => {
      const key = getRecipientKey(r);
      const amount = effectiveAdjustments.byKey[key] ?? 0;
      return {
        actor_id: r.actor_id,
        actor_login: r.actor_login,
        platform: r.platform,
        email: r.email,
        is_registered: r.is_registered,
        user_id: r.user_id,
        contribution_score: r.contribution_score,
        amount,
      };
    });
    return {
      source_selector: selectedPool!.source_selector,
      project_scope: {
        tags: selectedTags.map((t) => t.id),
        operation: selectedTags.length >= 2 ? projectOperation : "AND",
      },
      user_scope: null,
      start_month: startMonth + "-01",
      end_month: endMonth + "-01",
      adjustment_ratio: theoreticalTotal > 0 ? totalAdjustedPoints / theoreticalTotal : 1,
      total_amount: effectiveAdjustments.total,
      allocations,
    };
  }

  async function handlePreview() {
    if (!canPreview) return;
    setPreviewLoading(true);
    setPreviewData(null);
    setIndividualAdjustments({});
    setPreviewPage(1);
    try {
      const { data } = await api.post<PreviewResponse>(
        "/points/allocations/preview",
        buildPreviewBody()
      );
      setPreviewData(data);
      // 设置滑块默认值
      const ratio = data.contribution_to_points_ratio ?? 300;
      const computedTheoreticalTotal = data.preview.reduce(
        (sum, r) => sum + Math.floor(r.contribution_score * ratio),
        0,
      );
      const ab = selectedPool!.available_balance;
      const defaultTotal = Math.min(computedTheoreticalTotal, ab);
      setTotalAmount(defaultTotal);
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t('pointAllocation.previewFailed'), { description: apiErr.message });
    } finally {
      setPreviewLoading(false);
    }
  }

  function openConfirmDialog() {
    if (!canExecute) return;
    setConfirmOpen(true);
  }

  async function handleExecute() {
    setConfirmOpen(false);
    setExecuting(true);
    try {
      const { data } = await api.post<AllocationResult>(
        "/points/allocations",
        buildExecuteBody()
      );
      toast.success(t('pointAllocation.executeSuccess'), {
        description: t('pointAllocation.executeSuccessDesc', {
          success: data.result.success,
          pending: data.result.pending,
          failed: data.result.failed,
          totalPoints: data.result.total_points,
        }),
      });
      navigate("/points");
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t('pointAllocation.executeFailed'), { description: apiErr.message });
    } finally {
      setExecuting(false);
    }
  }

  // --- Render ---
  if (poolsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pointAllocation.title')}</h1>
        <p className="text-muted-foreground">{t('pointAllocation.subtitle')}</p>
      </div>

      {/* Step 1 - 选择积分池 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="size-5" />
            {t('pointAllocation.step1Title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('pointAllocation.poolLabel')}</Label>
            <Select
              value={selectedPoolIndex !== null ? String(selectedPoolIndex) : ""}
              onValueChange={(val) => {
                const idx = Number(val);
                setSelectedPoolIndex(idx);
                setTotalAmount(pools[idx].available_balance);
                setPreviewData(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('pointAllocation.poolPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {userPools.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{t('pointAllocation.personalPool')}</SelectLabel>
                    {userPools.map((p) => {
                      const idx = pools.indexOf(p);
                      return (
                        <SelectItem key={idx} value={String(idx)}>
                          {p.owner_name} - {p.point_type === "cash" ? t('pointAllocation.cashPoints') : t('pointAllocation.giftPoints')}
                          {p.tag?.name ? ` (${p.tag.name})` : ""} - {t('pointAllocation.balance')}: {p.available_balance}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                )}
                {orgPools.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{t('pointAllocation.orgPool')}</SelectLabel>
                    {orgPools.map((p) => {
                      const idx = pools.indexOf(p);
                      return (
                        <SelectItem key={idx} value={String(idx)}>
                          {p.owner_name} - {p.point_type === "cash" ? t('pointAllocation.cashPoints') : t('pointAllocation.giftPoints')}
                          {p.tag?.name ? ` (${p.tag.name})` : ""} - {t('pointAllocation.balance')}: {p.available_balance}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPool && (
            <div className="flex items-center gap-2">
              <Badge
                className={
                  selectedPool.point_type === "cash"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                }
              >
                {selectedPool.point_type === "cash" ? t('pointAllocation.cashPointsType') : t('pointAllocation.giftPointsType')}
              </Badge>
              {selectedPool.tag?.name && (
                <Badge variant="outline">{selectedPool.tag.name}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {t('pointAllocation.availableBalance')}: {selectedPool.available_balance.toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 - 选择项目范围 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderSearch className="size-5" />
            {t('pointAllocation.step2Title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label>{t('pointAllocation.selectedTags')}</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => {
                  const labelLogo = inferLabelAvatarUrl(tag.id);
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm"
                    >
                      {labelLogo && (
                        <img
                          src={labelLogo}
                          alt={tag.name}
                          className="size-6 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-base font-semibold leading-none">{tag.name}</span>
                      {tag.type && (
                        <Badge variant="outline" className="text-xs">
                          {tag.type}
                        </Badge>
                      )}
                      <button
                        type="button"
                        aria-label={t('pointAllocation.removeTag', { name: tag.name })}
                        className="ml-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id));
                          setPreviewData(null);
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('pointAllocation.searchTagLabel')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('pointAllocation.searchTagPlaceholder')}
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
              />
              {tagSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {tagSearchResults.length > 0 && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {tagSearchResults.map((tag) => {
                const alreadyAdded = selectedTags.some((t) => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm disabled:opacity-50"
                    disabled={alreadyAdded}
                    onClick={() => {
                      setSelectedTags((prev) => [...prev, tag]);
                      setTagSearchQuery("");
                      setTagSearchResults([]);
                      setPreviewData(null);
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      {tag.platforms && tag.platforms.length > 0 && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          {tag.platforms.map((p) => (
                            <img
                              key={p}
                              src={`https://oss.open-digger.cn/logos/${p.toLowerCase()}.png`}
                              alt={p}
                              title={p}
                              className="size-4 rounded-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ))}
                        </span>
                      )}
                      <span>
                        {tag.name}{" "}
                        <span className="text-muted-foreground">
                          ({tag.type})
                        </span>
                      </span>
                    </span>
                    {alreadyAdded && <CheckCircle className="size-4 text-green-500" />}
                  </button>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Step 3 - 时间区间 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-5" />
            {t('pointAllocation.step3Title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('pointAllocation.startMonth')}</Label>
              <MonthPicker
                min="2015-01"
                max={getMaxMonth()}
                value={startMonth}
                onChange={(e) => { setStartMonth(e.target.value); setPreviewData(null); }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pointAllocation.endMonth')}</Label>
              <MonthPicker
                min="2015-01"
                max={getMaxMonth()}
                value={endMonth}
                onChange={(e) => { setEndMonth(e.target.value); setPreviewData(null); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!canPreview || previewLoading}
          onClick={handlePreview}
        >
          {previewLoading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Eye className="size-4 mr-2" />
          )}
          {t('pointAllocation.previewButton')}
        </Button>
      </div>

      {/* Preview results */}
      {previewData && (
        <>
          <Separator />

          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">{t('pointAllocation.totalPeople')}</p>
                <p className="text-2xl font-bold">{previewData.preview.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">{t('pointAllocation.registered')}</p>
                <p className="text-2xl font-bold text-green-600">{registeredCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">{t('pointAllocation.unregistered')}</p>
                <p className="text-2xl font-bold text-orange-500">{unregisteredCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center sm:text-left">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
                  <span>{t('pointAllocation.totalPoints')}</span>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('pointAllocation.totalPointsRoundingTip')}
                          className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {t('pointAllocation.totalPointsRoundingTip')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className={`text-2xl font-bold ${effectiveAdjustments.scaled ? "text-amber-600" : ""}`}>
                  {totalAdjustedPoints.toLocaleString()}
                </p>
                {effectiveAdjustments.scaled && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('pointAllocation.scaledHint', {
                      defaultValue: '已按比例缩减至积分池可用上限',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 联动滑块控件 */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {/* 积分总量 + 比例 + 问号提示（同一行） */}
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <div className="flex items-baseline justify-center gap-1 text-lg sm:justify-start">
                    <span className="font-bold text-2xl">{totalAmount.toLocaleString()}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{availableBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-11 sm:size-8"
                            onClick={handleResetToRatioOne}
                            disabled={!previewData || theoreticalTotal <= 0}
                            aria-label={t('pointAllocation.resetToRatioOne')}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          {t('pointAllocation.resetToRatioOneTip')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-sm text-muted-foreground">
                      {t('pointAllocation.globalRatio')}: <span className="font-semibold text-foreground">{(actualRatio * 100).toFixed(1)}%</span>
                    </span>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
                            aria-label={t('pointAllocation.globalRatioTip')}
                          >
                            <HelpCircle className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          {t('pointAllocation.globalRatioTip')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Slider with border */}
                <div className="border border-border rounded-lg px-4 py-4 sm:py-3">
                  <Slider
                    min={0}
                    max={availableBalance}
                    step={1}
                    value={[totalAmount]}
                    onValueChange={handleSliderChange}
                    className="w-full"
                  />
                </div>

                {/* UI 提示 */}
                {theoreticalTotal > 0 && theoreticalTotal <= availableBalance && (
                  <p className="text-center text-xs text-green-600">
                    {t('pointAllocation.sufficientBalanceHint')}
                  </p>
                )}
                {theoreticalTotal > 0 && theoreticalTotal > availableBalance && (
                  <p className="text-center text-xs text-amber-600">
                    {t('pointAllocation.insufficientBalanceHint')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recipients table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('pointAllocation.contributorList')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border md:hidden">
                {paginatedPreviewRecipients.map((r) => {
                  const key = getRecipientKey(r);
                  const login = getRecipientLogin(r);
                  const normalizedPlatform = r.platform
                    ? normalizeRepoPlatform(r.platform)
                    : "";
                  const profileUrl = r.platform
                    ? getDeveloperProfileUrlByPlatform(r.platform, login)
                    : "";
                  const platformLogo = normalizedPlatform
                    ? `${OPEN_DIGGER_PLATFORM_LOGO_BASE}${normalizedPlatform}.png`
                    : "";
                  const inputId = `allocation-${key || r.email || login}`;

                  return (
                    <article
                      key={key || r.email || String(r.contribution_score)}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            {platformLogo && (
                              <img
                                src={platformLogo}
                                alt={r.platform}
                                title={r.platform}
                                className="size-5 shrink-0 rounded-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            {profileUrl ? (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm font-semibold text-primary hover:underline"
                              >
                                {login}
                              </a>
                            ) : (
                              <span className="truncate text-sm font-semibold">{login}</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('pointAllocation.contribution')}: {r.contribution_score.toFixed(2)}
                          </p>
                        </div>
                        {r.is_registered ? (
                          <Badge className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            {t('pointAllocation.registered')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            {t('pointAllocation.unregistered')}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('pointAllocation.calculatedPoints')}</p>
                          <p className="mt-1 font-semibold tabular-nums">
                            {(computedBasePoints.get(key) ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={inputId} className="text-xs text-muted-foreground">
                            {t('pointAllocation.adjustedPoints')}
                          </Label>
                          <Input
                            id={inputId}
                            type="number"
                            min={0}
                            inputMode="numeric"
                            className="text-right tabular-nums"
                            value={getAdjustedPoints(r)}
                            onChange={(e) => {
                              if (!key) return;
                              setIndividualAdjustments((prev) => ({
                                ...prev,
                                [key]: Number(e.target.value),
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-3 min-h-11 w-full"
                        onClick={() => {
                          if (!key) return;
                          setIndividualAdjustments((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        }}
                      >
                        {t('pointAllocation.reset')}
                      </Button>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pointAllocation.username')}</TableHead>
                      <TableHead>{t('pointAllocation.status')}</TableHead>
                      <TableHead className="text-right">{t('pointAllocation.contribution')}</TableHead>
                      <TableHead className="text-right">{t('pointAllocation.calculatedPoints')}</TableHead>
                      <TableHead className="text-right">{t('pointAllocation.adjustedPoints')}</TableHead>
                      <TableHead className="text-center">{t('pointAllocation.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPreviewRecipients.map((r) => {
                      const login = getRecipientLogin(r);
                      const normalizedPlatform = r.platform
                        ? normalizeRepoPlatform(r.platform)
                        : "";
                      const profileUrl = r.platform
                        ? getDeveloperProfileUrlByPlatform(r.platform, login)
                        : "";
                      const platformLogo = normalizedPlatform
                        ? `${OPEN_DIGGER_PLATFORM_LOGO_BASE}${normalizedPlatform}.png`
                        : "";
                      return (
                      <TableRow key={getRecipientKey(r) || r.email || String(r.contribution_score)}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {platformLogo && (
                              <img
                                src={platformLogo}
                                alt={r.platform}
                                title={r.platform}
                                className="size-4 rounded-full object-cover shrink-0"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            {profileUrl ? (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {login}
                              </a>
                            ) : (
                              <span>{login}</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.is_registered ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              {t('pointAllocation.registered')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{t('pointAllocation.unregistered')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.contribution_score.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(computedBasePoints.get(getRecipientKey(r)) ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            className="w-24 ml-auto text-right"
                            value={getAdjustedPoints(r)}
                            onChange={(e) => {
                              const key = getRecipientKey(r);
                              if (!key) return;
                              setIndividualAdjustments((prev) => ({
                                ...prev,
                                [key]: Number(e.target.value),
                              }));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const key = getRecipientKey(r);
                              if (!key) return;
                              setIndividualAdjustments((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }}
                          >
                            {t('pointAllocation.reset')}
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {previewData.preview.length > PREVIEW_PAGE_SIZE && (
                <div className="mt-4">
                  <DataPagination
                    currentPage={previewPage}
                    totalPages={Math.max(
                      1,
                      Math.ceil(previewData.preview.length / PREVIEW_PAGE_SIZE),
                    )}
                    onPageChange={setPreviewPage}
                    totalItems={previewData.preview.length}
                    pageSize={PREVIEW_PAGE_SIZE}
                    previousLabel={t('pointAllocation.prevPage', {
                      defaultValue: '上一页',
                    })}
                    nextLabel={t('pointAllocation.nextPage', {
                      defaultValue: '下一页',
                    })}
                    infoText={t('pointAllocation.paginationInfo', {
                      defaultValue: '第 {{start}}-{{end}} 位 / 共 {{total}} 位',
                      start: (previewPage - 1) * PREVIEW_PAGE_SIZE + 1,
                      end: Math.min(
                        previewPage * PREVIEW_PAGE_SIZE,
                        previewData.preview.length,
                      ),
                      total: previewData.preview.length,
                    })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Execute button */}
          <div className="flex justify-center pb-8">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={!canExecute || executing}
              onClick={openConfirmDialog}
            >
              {executing ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              {t('pointAllocation.executeButton')}
            </Button>
          </div>
        </>
      )}

      {/* Confirm Allocation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pointAllocation.confirmExecute')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmTotalPeople')}</span>
                  <span className="font-semibold text-foreground">{previewData?.preview.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmRegistered')}</span>
                  <span className="font-semibold text-green-600">{registeredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmUnregistered')}</span>
                  <span className="font-semibold text-orange-500">{unregisteredCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmTotalPoints')}</span>
                  <span className="font-semibold text-foreground">{totalAdjustedPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmRatio')}</span>
                  <span className="font-semibold text-foreground">{actualRatio.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pointAllocation.confirmRemainingPoints')}</span>
                  <span className="font-semibold text-foreground">
                    {((selectedPool?.available_balance ?? 0) - totalAdjustedPoints).toLocaleString()}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel>{t('pointAllocation.confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>
              {t('pointAllocation.confirmConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

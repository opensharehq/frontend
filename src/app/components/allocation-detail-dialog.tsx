import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import AllocationAccountSearch from '@/app/components/allocation-account-search';
import { getAllocationAccountLogin as getItemLogin, useAllocationAccountSearch } from '@/lib/allocation-accounts';
import { DataPagination } from "@/app/components/ui/data-pagination";
import {
  getDeveloperProfileUrlByPlatform,
  normalizeRepoPlatform,
} from "@/pages/insight/domain/repoPlatform";
import { OPEN_DIGGER_PLATFORM_LOGO_BASE } from "@/pages/insight/api/constants";

interface ContributionItem {
  // 平台无关的通用键（后端已提供）
  platform?: string;
  actor_id?: string;
  actor_login?: string;
  // 兼容老数据 / GitHub 专用键
  github_login?: string;
  github_id?: string;
  email?: string;
  is_registered: boolean;
  user_id?: number | null;
  contribution_score?: number;
  calculated_points?: number;
  adjusted_points?: number;
  // contribution_data 快照中持久化的最终分配金额
  amount?: number;
  // 后端按平台动态返回 `{platform}_login` 字段
  [key: string]: unknown;
}

interface PendingGrantItem {
  id: number;
  platform?: string;
  actor_id?: string;
  actor_login?: string;
  // 兼容老数据
  github_login?: string;
  email: string;
  amount: number;
  point_type: "cash" | "gift";
  is_claimed: boolean;
  claimed_at: string | null;
  expires_at: string | null;
}

/** 渲染带平台 logo + profile 链接的登录名单元格 */
function RecipientLoginCell({
  platform,
  login,
}: {
  platform?: string;
  login: string;
}) {
  const normalizedPlatform = platform ? normalizeRepoPlatform(platform) : "";
  const profileUrl =
    platform && login ? getDeveloperProfileUrlByPlatform(platform, login) : "";
  const platformLogo = normalizedPlatform
    ? `${OPEN_DIGGER_PLATFORM_LOGO_BASE}${normalizedPlatform}.png`
    : "";
  if (!login) return <span className="text-sm">-</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {platformLogo && (
        <img
          src={platformLogo}
          alt={platform}
          title={platform}
          className="size-4 rounded-full object-cover shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
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
  );
}

interface AllocationDetail {
  id: number;
  note?: string;
  status: string;
  total_amount: number;
  start_month: string;
  end_month: string;
  adjustment_ratio: number;
  contribution_data: ContributionItem[];
  pending_grants: PendingGrantItem[];
  total_recipients: number;
  registered_recipients: number;
  unregistered_recipients: number;
  created_at: string;
  executed_at: string | null;
}

interface AllocationDetailDialogProps {
  allocationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DETAIL_PAGE_SIZE = 10;

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

/**
 * 从 reference_id (格式: allocation_{id}) 中解析出分配 ID
 * 不匹配时返回 null
 */
export function parseAllocationIdFromReference(
  referenceId: string | null | undefined,
): number | null {
  if (!referenceId) return null;
  const match = /^allocation_(\d+)$/.exec(referenceId);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export default function AllocationDetailDialog({
  allocationId,
  open,
  onOpenChange,
}: AllocationDetailDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AllocationDetail | null>(null);
  const [registeredPage, setRegisteredPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [activeTab, setActiveTab] = useState('registered');
  const [accountQuery, setAccountQuery] = useState('');

  const fetchDetail = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const { data } = await api.get<AllocationDetail>(
          `/points/allocations/${id}`,
        );
        setDetail(data);
      } catch (err) {
        const apiErr = getApiError(err);
        toast.error(t("allocationDetail.loadFailed"), {
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
      setDetail(null);
      setRegisteredPage(1);
      setPendingPage(1);
      setAccountQuery('');
      void fetchDetail(allocationId);
    }
  }, [open, allocationId, fetchDetail]);

  // 已注册账号列表：按金额倒序（优先 adjusted_points，回退 amount）
  const registeredList = useMemo(
    () =>
      (detail?.contribution_data || [])
        .filter(
          (item) =>
            item.is_registered &&
            ((item.adjusted_points ?? item.amount) ?? 0) > 0,
        )
        .slice()
        .sort(
          (a, b) =>
            ((b.adjusted_points ?? b.amount) ?? 0) -
            ((a.adjusted_points ?? a.amount) ?? 0),
        ),
    [detail],
  );

  // 待领取账号列表：按 amount 倒序，金额最大的在前
  const pendingList = useMemo(
    () =>
      (detail?.pending_grants || [])
        .slice()
        .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
    [detail],
  );

  const filteredRegistered = useAllocationAccountSearch(registeredList, accountQuery);
  const filteredPending = useAllocationAccountSearch(pendingList, accountQuery);
  const registeredTotal = filteredRegistered.length;
  const pendingTotal = filteredPending.length;
  const registeredTotalPages = Math.max(1, Math.ceil(registeredTotal / DETAIL_PAGE_SIZE));
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / DETAIL_PAGE_SIZE));
  const registeredPageItems = filteredRegistered.slice((registeredPage - 1) * DETAIL_PAGE_SIZE, registeredPage * DETAIL_PAGE_SIZE);
  const pendingPageItems = filteredPending.slice((pendingPage - 1) * DETAIL_PAGE_SIZE, pendingPage * DETAIL_PAGE_SIZE);

  const statusLabel = detail
    ? t(`allocationDetail.status.${detail.status}`, {
        defaultValue: detail.status,
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {detail
              ? t("allocationDetail.titleWithId", { id: detail.id })
              : t("allocationDetail.title")}
          </DialogTitle>
          <DialogDescription>
            {t("allocationDetail.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <p className="text-center text-muted-foreground py-16">
            {t("allocationDetail.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* 概要信息 */}
            {/* 10 points = 1 USD hint */}
            <p className="text-xs text-muted-foreground text-center">
              {t('pointAllocation.pointsToUsdHint')}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-md border p-3 bg-muted/30">
              <InfoItem
                label={t("allocationDetail.status.label")}
                value={
                  <Badge variant={statusBadgeVariant(detail.status)}>
                    {statusLabel}
                  </Badge>
                }
              />
              <InfoItem
                label={t("allocationDetail.totalAmount")}
                value={
                  <span className="font-medium">
                    {detail.total_amount.toLocaleString()}
                  </span>
                }
              />
              <InfoItem
                label={t("allocationDetail.totalRecipients")}
                value={
                  <span>
                    {detail.total_recipients}
                    <span className="text-muted-foreground text-xs ml-1">
                      (
                      {t("allocationDetail.recipientsBreakdown", {
                        registered: detail.registered_recipients,
                        unregistered: detail.unregistered_recipients,
                      })}
                      )
                    </span>
                  </span>
                }
              />
              <InfoItem
                label={t("allocationDetail.period")}
                value={`${detail.start_month.slice(0, 7)} ~ ${detail.end_month.slice(0, 7)}`}
              />
              <InfoItem
                label={t("allocationDetail.adjustmentRatio")}
                value={`×${detail.adjustment_ratio}`}
              />
              <InfoItem
                label={t("allocationDetail.executedAt")}
                value={
                  detail.executed_at
                    ? format(
                        new Date(detail.executed_at),
                        "yyyy-MM-dd HH:mm",
                      )
                    : "-"
                }
              />
            </div>

            {detail.note && (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-2">{t('pointAllocation.noteLabel')}</div>
                <p className="text-sm break-all">{detail.note}</p>
              </div>
            )}

            <AllocationAccountSearch
              value={accountQuery}
              onChange={(query) => { setAccountQuery(query); setRegisteredPage(1); setPendingPage(1); }}
              matchedCount={activeTab === 'registered' ? registeredTotal : pendingTotal}
              totalCount={activeTab === 'registered' ? registeredList.length : pendingList.length}
            />

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList>
                <TabsTrigger value="registered">
                  {t("allocationDetail.registeredTab", {
                    count: registeredTotal,
                  })}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t("allocationDetail.pendingTab", {
                    count: pendingTotal,
                  })}
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="registered"
                className="flex flex-col gap-3 overflow-hidden"
              >
                <div className="overflow-auto border rounded-md">
                {registeredTotal === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    {t(accountQuery.trim() ? "allocationSearch.noResults" : "allocationDetail.emptyRegistered")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("allocationDetail.accountLogin", {
                            defaultValue: "账号",
                          })}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("allocationDetail.contributionScore")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("allocationDetail.calculatedPoints")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("allocationDetail.adjustedPoints")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registeredPageItems.map((item) => (
                        <TableRow
                          key={`${item.platform || ""}-${item.actor_id || item.github_id || ""}-${item.user_id ?? ""}`}
                        >
                          <TableCell>
                            <RecipientLoginCell
                              platform={item.platform}
                              login={getItemLogin(item)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.contribution_score != null
                              ? Number(item.contribution_score).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 2 },
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.calculated_points != null
                              ? item.calculated_points.toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            {(item.adjusted_points ?? item.amount) != null
                              ? `+${(item.adjusted_points ?? item.amount)!.toLocaleString()}`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                </div>
                <DataPagination
                  currentPage={registeredPage}
                  totalPages={registeredTotalPages}
                  onPageChange={setRegisteredPage}
                  totalItems={registeredTotal}
                  pageSize={DETAIL_PAGE_SIZE}
                  previousLabel={t("allocationDetail.prevPage", {
                    defaultValue: "上一页",
                  })}
                  nextLabel={t("allocationDetail.nextPage", {
                    defaultValue: "下一页",
                  })}
                />
              </TabsContent>

              <TabsContent
                value="pending"
                className="flex flex-col gap-3 overflow-hidden"
              >
                <div className="overflow-auto border rounded-md">
                {pendingTotal === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    {t(accountQuery.trim() ? "allocationSearch.noResults" : "allocationDetail.emptyPending")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t("allocationDetail.accountLogin", {
                            defaultValue: "账号",
                          })}
                        </TableHead>
                        <TableHead>
                          {t("allocationDetail.email")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("allocationDetail.amount")}
                        </TableHead>
                        <TableHead>
                          {t("allocationDetail.claimStatus")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPageItems.map((grant) => (
                        <TableRow key={grant.id}>
                          <TableCell>
                            <RecipientLoginCell
                              platform={grant.platform}
                              login={getItemLogin(grant)}
                            />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {grant.email || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            +{grant.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {grant.is_claimed ? (
                              <Badge variant="default" className="text-xs">
                                {t("allocationDetail.claimed")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {t("allocationDetail.unclaimed")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                </div>
                <DataPagination
                  currentPage={pendingPage}
                  totalPages={pendingTotalPages}
                  onPageChange={setPendingPage}
                  totalItems={pendingTotal}
                  pageSize={DETAIL_PAGE_SIZE}
                  previousLabel={t("allocationDetail.prevPage", {
                    defaultValue: "上一页",
                  })}
                  nextLabel={t("allocationDetail.nextPage", {
                    defaultValue: "下一页",
                  })}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
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

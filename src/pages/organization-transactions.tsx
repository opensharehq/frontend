import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  XCircle,
  Loader2,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import api, { getApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { toast } from "sonner";
import AllocationDetailDialog, {
  parseAllocationIdFromReference,
} from "@/app/components/allocation-detail-dialog";
import AllocationSummaryDialog from "@/app/components/allocation-summary-dialog";
import { DataPagination } from "@/app/components/ui/data-pagination";

interface TxTag {
  id: number;
  slug: string;
  name: string;
}

interface TxCreator {
  id: number;
  username: string;
}

interface Transaction {
  id: number;
  transaction_type: "earn" | "spend" | "withdraw" | "expire";
  amount: number;
  point_type: "cash" | "gift";
  balance_after: number;
  description: string;
  reference_id: string;
  tag: TxTag | null;
  created_by: TxCreator | null;
  created_at: string;
  // 后端合并同一次分配后的扣款明细数量
  merged_count?: number;
}

interface OrgInfo {
  slug: string;
  name: string;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface TransactionsResponse {
  items: Transaction[];
  pagination: PaginationMeta;
  organization?: OrgInfo;
}

const TRANSACTION_TYPE_VALUES = ["all", "earn", "spend", "withdraw", "expire"] as const;
const POINT_TYPE_VALUES = ["all", "cash", "gift"] as const;

function TransactionTypeIcon({ type }: { type: Transaction["transaction_type"] }) {
  switch (type) {
    case "earn":
      return <TrendingUp className="size-4 text-emerald-500" />;
    case "spend":
      return <TrendingDown className="size-4 text-red-500" />;
    case "withdraw":
      return <ArrowUpRight className="size-4 text-orange-500" />;
    case "expire":
      return <XCircle className="size-4 text-gray-400" />;
  }
}

function transactionTypeLabel(
  type: Transaction["transaction_type"],
  t: (key: string) => string,
) {
  const map: Record<string, string> = {
    earn: t("transactions.earn"),
    spend: t("transactions.spend"),
    withdraw: t("transactions.withdraw"),
    expire: t("transactions.expire"),
  };
  return map[type] || type;
}

export default function OrganizationTransactionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orgName, setOrgName] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [transactionType, setTransactionType] = useState("all");
  const [pointType, setPointType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailAllocationId, setDetailAllocationId] = useState<number | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [summaryAllocationId, setSummaryAllocationId] = useState<
    number | null
  >(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const TRANSACTION_TYPE_OPTIONS = TRANSACTION_TYPE_VALUES.map((v) => ({
    value: v,
    label: v === "all" ? t("transactions.allTypes") : t(`transactions.${v}`),
  }));
  const POINT_TYPE_OPTIONS = POINT_TYPE_VALUES.map((v) => ({
    value: v,
    label:
      v === "all"
        ? t("transactions.allPoints")
        : v === "cash"
          ? t("transactions.cash")
          : t("transactions.gift"),
  }));
  const dateLocale = i18n.language === "en" ? enUS : zhCN;

  const fetchTransactions = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
        group_allocations: 1,
      };
      if (transactionType !== "all") params.transaction_type = transactionType;
      if (pointType !== "all") params.point_type = pointType;

      const { data } = await api.get<TransactionsResponse>(
        `/points/organizations/${slug}/transactions`,
        { params },
      );
      setTransactions(data.items);
      setTotal(data.pagination?.total_items ?? 0);
      if (data.organization?.name) setOrgName(data.organization.name);
    } catch (err) {
      const apiErr = getApiError(err);
      toast.error(t("transactions.loadFailed"), { description: apiErr.message });
    } finally {
      setLoading(false);
    }
  }, [slug, page, pageSize, transactionType, pointType, t]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTransactionTypeChange = (value: string) => {
    setTransactionType(value);
    setPage(1);
  };

  const handlePointTypeChange = (value: string) => {
    setPointType(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 顶部返回 + 标题 */}
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
          <Link to={slug ? `/organizations/${slug}` : "/organizations"}>
            <ArrowLeft className="size-4" />
            {t("orgTransactions.backToOrg")}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("orgTransactions.title")}
          </h1>
          <p className="text-muted-foreground">
            {orgName
              ? t("orgTransactions.subtitleWithOrg", { name: orgName })
              : t("orgTransactions.subtitle")}
          </p>
        </div>
      </div>

      {/* 筛选区 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={transactionType} onValueChange={handleTransactionTypeChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t("transactions.transactionType")} />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={pointType} onValueChange={handlePointTypeChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t("transactions.pointTypeLabel")} />
              </SelectTrigger>
              <SelectContent>
                {POINT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 交易列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("transactions.totalRecords", { total })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {t("transactions.noRecords")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transactions.type")}</TableHead>
                  <TableHead>{t("transactions.description")}</TableHead>
                  <TableHead className="text-right">
                    {t("transactions.amount")}
                  </TableHead>
                  <TableHead>{t("transactions.pointType")}</TableHead>
                  <TableHead>{t("transactions.tag")}</TableHead>
                  <TableHead>{t("orgTransactions.operator")}</TableHead>
                  <TableHead>{t("transactions.time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const spendAllocationId =
                    tx.transaction_type === "spend"
                      ? parseAllocationIdFromReference(tx.reference_id)
                      : null;
                  const earnAllocationId =
                    tx.transaction_type === "earn"
                      ? parseAllocationIdFromReference(tx.reference_id)
                      : null;
                  const mergedCount = tx.merged_count ?? 1;
                  return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TransactionTypeIcon type={tx.transaction_type} />
                        <span className="text-sm">
                          {transactionTypeLabel(tx.transaction_type, t)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px]" title={tx.description}>
                      <div className="flex items-center gap-2">
                        <span className={earnAllocationId != null ? "min-w-[200px] whitespace-normal break-words" : "truncate"}>{tx.description}</span>
                        {mergedCount > 1 && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0"
                            title={t("transactions.mergedDebitsTitle", {
                              count: mergedCount,
                              defaultValue:
                                "同一次分配的 {{count}} 笔扣款已合并展示，包含分批执行或跨积分来源产生的明细",
                            })}
                          >
                            {t("transactions.mergedDebits", {
                              count: mergedCount,
                              defaultValue: "合并 {{count}} 笔扣款",
                            })}
                          </Badge>
                        )}
                        {spendAllocationId != null && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs shrink-0"
                            onClick={() => {
                              setDetailAllocationId(spendAllocationId);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="size-3.5" />
                            {t("transactions.viewAllocation")}
                          </Button>
                        )}
                        {earnAllocationId != null && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs shrink-0"
                            onClick={() => {
                              setSummaryAllocationId(earnAllocationId);
                              setSummaryOpen(true);
                            }}
                          >
                            <Eye className="size-3.5" />
                            {t("transactions.viewAllocationSummary")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          tx.amount > 0
                            ? "text-emerald-600"
                            : tx.amount < 0
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.point_type === "cash" ? "default" : "secondary"}
                      >
                        {tx.point_type === "cash"
                          ? t("transactions.cash")
                          : t("transactions.gift")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.tag ? (
                        <Badge variant="outline">{tx.tag.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.created_by ? (
                        <span className="text-sm">{tx.created_by.username}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm text-muted-foreground"
                        title={format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss")}
                      >
                        {formatDistanceToNow(new Date(tx.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="pt-4">
              <DataPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={total}
                pageSize={pageSize}
                previousLabel={t("transactions.prevPage")}
                nextLabel={t("transactions.nextPage")}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AllocationDetailDialog
        allocationId={detailAllocationId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <AllocationSummaryDialog
        allocationId={summaryAllocationId}
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
      />
    </div>
  );
}

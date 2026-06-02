import { useState, useEffect, useCallback } from "react";
import api, { getApiError } from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Bell,
  MessageCircle,
  CreditCard,
  Truck,
  Calendar,
  Megaphone,
  Coins,
  ShoppingBag,
  Shield,
  Banknote,
  CheckCheck,
  Trash2,
  MailOpen,
  MailX,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Separator } from "@/app/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

// ─── Types ───────────────────────────────────────────────

type MessageType =
  | "system"
  | "personal"
  | "payment"
  | "shipping"
  | "activity"
  | "announcement"
  | "points"
  | "order"
  | "security"
  | "withdrawal";

interface Sender {
  id: number;
  username: string;
}

interface MessageItem {
  id: number;
  user_message_id: number;
  title: string;
  message_type: MessageType;
  sender: Sender | null;
  is_broadcast: boolean;
  is_read: boolean;
  read_at: string | null;
  received_at: string;
  created_at: string;
  content_preview: string;
}

interface MessageDetail {
  id: number;
  user_message_id: number;
  title: string;
  message_type: MessageType;
  sender: Sender | null;
  content: string;
  is_read: boolean;
  read_at: string | null;
  received_at: string;
  created_at: string;
}

interface MessageListResponse {
  items: MessageItem[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Constants ───────────────────────────────────────────

const MESSAGE_TYPE_CONFIG: Record<
  MessageType,
  { labelKey: string; icon: typeof Bell; color: string }
> = {
  system: { labelKey: "messages.system", icon: Bell, color: "text-blue-500" },
  personal: { labelKey: "messages.personal", icon: MessageCircle, color: "text-purple-500" },
  payment: { labelKey: "messages.payment", icon: CreditCard, color: "text-green-500" },
  shipping: { labelKey: "messages.shipping", icon: Truck, color: "text-orange-500" },
  activity: { labelKey: "messages.activity", icon: Calendar, color: "text-indigo-500" },
  announcement: { labelKey: "messages.announcement", icon: Megaphone, color: "text-red-500" },
  points: { labelKey: "messages.points", icon: Coins, color: "text-yellow-500" },
  order: { labelKey: "messages.order", icon: ShoppingBag, color: "text-sky-500" },
  security: { labelKey: "messages.security", icon: Shield, color: "text-red-500" },
  withdrawal: { labelKey: "messages.withdrawal", icon: Banknote, color: "text-green-500" },
};

const PAGE_SIZE = 20;

// ─── Simple Markdown renderer ───────────────────────────

function renderMarkdown(content: string): string {
  const html = content
    // escape html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // inline code
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // line breaks
    .replace(/\n/g, "<br/>");
  return html;
}

// ─── Component ──────────────────────────────────────────

export default function MessagesPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? enUS : zhCN;
  // State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMessage, setDetailMessage] = useState<MessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Data Fetching ──────────────────────────────────

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: PAGE_SIZE,
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.message_type = typeFilter;

      const { data } = await api.get<MessageListResponse>("/messages/", { params });
      setMessages(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get<{ count: number }>("/messages/unread-count");
      setUnreadCount(data.count);
      window.dispatchEvent(
        new CustomEvent("messages:unread-changed", { detail: { count: data.count } })
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, typeFilter]);

  // 轮询检测新消息
  useEffect(() => {
    const prevUnreadRef = { current: unreadCount };

    const pollNewMessages = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data } = await api.get<{ count: number }>("/messages/unread-count");
        if (data.count !== prevUnreadRef.current) {
          prevUnreadRef.current = data.count;
          setUnreadCount(data.count);
          fetchMessages(); // 有变化时刷新列表
          window.dispatchEvent(
            new CustomEvent("messages:unread-changed", { detail: { count: data.count } })
          );
        }
      } catch (e) {
        // 静默失败，不打断用户操作
      }
    };

    const intervalId = setInterval(pollNewMessages, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollNewMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMessages, unreadCount]);

  // ─── Actions ────────────────────────────────────────

  const openDetail = async (msg: MessageItem) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get<MessageDetail>(`/messages/${msg.id}`);
      setDetailMessage(data);
      // Auto mark read
      if (!msg.is_read) {
        await api.post(`/messages/${msg.id}/mark-read`);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
        );
        fetchUnreadCount();
      }
    } catch (err) {
      toast.error(getApiError(err).message);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/messages/mark-all-read");
      toast.success(t('messages.markAllReadSuccess'));
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleBatchMarkRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post("/messages/mark-read", { message_ids: Array.from(selectedIds) });
      toast.success(t('messages.markReadSuccess'));
      setSelectedIds(new Set());
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleBatchMarkUnread = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post("/messages/mark-unread", { message_ids: Array.from(selectedIds) });
      toast.success(t('messages.markUnreadSuccess'));
      setSelectedIds(new Set());
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post("/messages/delete", { message_ids: Array.from(selectedIds) });
      toast.success(t('messages.deleteSuccess'));
      setSelectedIds(new Set());
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDetailMarkUnread = async () => {
    if (!detailMessage) return;
    try {
      await api.post("/messages/mark-unread", {
        message_ids: [detailMessage.user_message_id],
      });
      toast.success(t('messages.markUnreadSuccess'));
      setDetailOpen(false);
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const handleDetailDelete = async () => {
    if (!detailMessage) return;
    try {
      await api.post("/messages/delete", {
        message_ids: [detailMessage.user_message_id],
      });
      toast.success(t('messages.deleteMessageSuccess'));
      setDetailOpen(false);
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  // ─── Selection helpers ──────────────────────────────

  const toggleSelect = (userMessageId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userMessageId)) next.delete(userMessageId);
      else next.add(userMessageId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.user_message_id)));
    }
  };

  const allSelected = messages.length > 0 && selectedIds.size === messages.length;

  // ─── Render helpers ─────────────────────────────────

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateStr;
    }
  };

  const TypeIcon = ({ type }: { type: MessageType }) => {
    const config = MESSAGE_TYPE_CONFIG[type];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`size-4 shrink-0 ${config.color}`} />;
  };

  // ─── JSX ────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t('messages.title')}</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{t('messages.unreadCount', { count: unreadCount })}</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="mr-1.5 size-4" />
          {t('messages.markAllRead')}
        </Button>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            {t('messages.selected', { count: selectedIds.size })}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <Button variant="ghost" size="sm" onClick={handleBatchMarkRead}>
            <MailOpen className="mr-1.5 size-4" />
            {t('messages.markRead')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBatchMarkUnread}>
            <MailX className="mr-1.5 size-4" />
            {t('messages.markUnread')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="mr-1.5 size-4" />
                {t('common.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('messages.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('messages.confirmDeleteDesc', { count: selectedIds.size })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleBatchDelete}>
                  {t('messages.confirmDelete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | "read" | "unread")}
        >
          <TabsList>
            <TabsTrigger value="all">{t('messages.all')}</TabsTrigger>
            <TabsTrigger value="unread">{t('messages.unread')}</TabsTrigger>
            <TabsTrigger value="read">{t('messages.read')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('messages.messageType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('messages.allTypes')}</SelectItem>
            {Object.entries(MESSAGE_TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {t(cfg.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages list */}
      <div className="rounded-lg border">
        {/* Select all header */}
        {messages.length > 0 && (
          <div className="flex items-center gap-3 border-b px-4 py-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label={t('messages.select')}
            />
            <span className="text-xs text-muted-foreground">
              {allSelected ? t('messages.deselectAll') : t('messages.selectAll')}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="mb-3 size-12 opacity-40" />
            <p className="text-sm">{t('messages.noMessages')}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${
                  !msg.is_read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                }`}
                onClick={() => openDetail(msg)}
              >
                {/* Checkbox */}
                <div
                  className="pt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(msg.user_message_id)}
                    onCheckedChange={() => toggleSelect(msg.user_message_id)}
                    aria-label={`${t('messages.select')} ${msg.title}`}
                  />
                </div>

                {/* Type icon */}
                <div className="pt-0.5">
                  <TypeIcon type={msg.message_type} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {/* Unread dot */}
                    {!msg.is_read && (
                      <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <span
                      className={`truncate text-sm ${
                        !msg.is_read ? "font-semibold" : ""
                      }`}
                    >
                      {msg.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {msg.content_preview}
                  </p>
                </div>

                {/* Meta */}
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  {msg.sender && (
                    <span className="text-xs text-muted-foreground">
                      {msg.sender.username}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatTime(msg.received_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('messages.totalMessages', { total, page, totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 size-4" />
              {t('messages.prevPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('messages.nextPage')}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="pr-8">
              {detailMessage?.title ?? t('messages.detailTitle')}
            </SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailMessage ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <TypeIcon type={detailMessage.message_type} />
                  <span className="ml-1">
                    {t(MESSAGE_TYPE_CONFIG[detailMessage.message_type]?.labelKey ?? '')}
                  </span>
                </Badge>
                {detailMessage.sender && (
                  <span className="text-sm text-muted-foreground">
                    {t('messages.from', { username: detailMessage.sender.username })}
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {formatTime(detailMessage.received_at)}
                {detailMessage.read_at && (
                  <span className="ml-3">
                    {t('messages.readAt', { time: formatTime(detailMessage.read_at) })}
                  </span>
                )}
              </div>

              <Separator />

              {/* Content */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(detailMessage.content),
                }}
              />

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDetailMarkUnread}>
                  <MailX className="mr-1.5 size-4" />
                  {t('messages.markUnread')}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="mr-1.5 size-4" />
                      {t('common.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('messages.confirmDeleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('messages.confirmDeleteSingle')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDetailDelete}>
                        {t('messages.confirmDelete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

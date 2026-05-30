import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  type LucideIcon,
  User,
  Mail,
  Calendar,
  MapPin,
  Building2,
  Globe,
  Twitter,
  Linkedin,
  Coins,
  Gift,
  Wallet,
  Briefcase,
  GraduationCap,
  Pencil,
  Link2,
  Unlink,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { inferDeveloperAvatarUrl } from '@/pages/insight/domain/repoPlatform';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
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
} from '@/app/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';

interface Profile {
  bio: string;
  birth_date: string | null;
  company: string;
  location: string;
}

interface SocialConnectionItem {
  provider: string;
  name: string;
  icon: string;
  is_connected: boolean;
  uid: string | null;
  username: string | null;
  profile_url: string | null;
  social_auth_id: number | null;
}

interface SocialProviderItem {
  provider: string;
  name: string;
  icon: string;
  start_url: string;
}

// 与落地页 platforms-section.tsx 保持一致，复用 OpenDigger OSS 提供的平台 logo
// 文件名规则：https://oss.open-digger.cn/logos/{slug}.png
const OPEN_DIGGER_LOGO_SLUGS: Record<string, string> = {
  github: 'github',
  gitlab: 'gitlab',
  gitee: 'gitee',
  atomgit: 'atomgit',
  huggingface: 'huggingface',
};

function getSocialProviderIcon(provider: string) {
  const logoSlug = OPEN_DIGGER_LOGO_SLUGS[provider];
  if (logoSlug) {
    return (
      <img
        src={`https://oss.open-digger.cn/logos/${logoSlug}.png`}
        alt=""
        aria-hidden="true"
        className="size-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  switch (provider) {
    case 'twitter-oauth2':
      return <Twitter className="size-4" aria-hidden="true" />;
    case 'linkedin-oauth2':
      return <Linkedin className="size-4" aria-hidden="true" />;
    case 'google-oauth2':
      return <Globe className="size-4" aria-hidden="true" />;
    default:
      return <Link2 className="size-4" aria-hidden="true" />;
  }
}

// 超过指定长度的文本以省略号截断，防止超长 ID/用户名冲出容器
function truncateText(text: string, max: number): string {
  if (!text) return text;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

// 构造 username(uid) 展示文本，同时返回原始未截断的文本用于 title 属性
function formatSocialAccountLabel(
  username: string | null | undefined,
  uid: string | null | undefined,
): { display: string; full: string } | null {
  const u = (username ?? '').trim();
  const i = (uid ?? '').trim();
  if (!u && !i) return null;
  const fullParts = u && i ? `${u}(${i})` : u || i;
  const tu = u ? truncateText(u, 20) : '';
  const ti = i ? truncateText(i, 16) : '';
  const display = tu && ti ? `${tu}(${ti})` : tu || ti;
  return { display, full: fullParts };
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatMonth(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM');
}

interface WorkExperience {
  id: number;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface Education {
  id: number;
  institution_name: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string | null;
}

interface PointsBalance {
  total: number;
  cash: number;
  gift: number;
}

type PointsTone = 'primary' | 'cash' | 'gift';

interface PointsItem {
  key: keyof PointsBalance;
  label: string;
  value: number;
  icon: LucideIcon;
  tone: PointsTone;
}

interface UserSummary {
  id: number;
  username: string;
  email: string;
}

interface ProfileData {
  user: UserSummary;
  profile: Profile;
  balance: PointsBalance;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProfileData | null>(null);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [socialConnections, setSocialConnections] = useState<SocialConnectionItem[]>([]);
  const [canDisconnectSocial, setCanDisconnectSocial] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // 添加社交账号弹窗状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<SocialProviderItem[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, workRes, eduRes, socialRes] = await Promise.all([
        api.get('/me/profile'),
        api.get('/me/work-experiences'),
        api.get('/me/educations'),
        api.get('/auth/social/connections').catch(() => null),
      ]);

      setData(profileRes.data);
      setWorkExperiences(workRes.data?.items ?? []);
      setEducations(eduRes.data?.items ?? []);
      if (socialRes) {
        setSocialConnections(socialRes.data?.connections ?? []);
        setCanDisconnectSocial(socialRes.data?.can_disconnect ?? true);
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('profile.loadFailedMsg'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSocialConnections = useCallback(async () => {
    try {
      const { data: socialData } = await api.get('/auth/social/connections');
      setSocialConnections(socialData?.connections ?? []);
      setCanDisconnectSocial(socialData?.can_disconnect ?? true);
    } catch {
      // 静默处理：社交连接禁用时不阻断主流程
    }
  }, []);

  const fetchAvailableProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const { data: providersData } = await api.get('/auth/social/providers');
      // 仅展示 GitHub 与 AtomGit；其它后端虽配置保留，但前端不再作为可绑定平台暴露
      const allowed = new Set(['github', 'atomgit']);
      const items: SocialProviderItem[] = (providersData?.providers ?? []).filter(
        (p: SocialProviderItem) => allowed.has(p.provider),
      );
      setAvailableProviders(items);
      setProvidersLoaded(true);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('profile.loadProvidersFailed'));
    } finally {
      setProvidersLoading(false);
    }
  }, [t]);

  const connectedSocialCount = socialConnections.filter((conn) => conn.is_connected).length;

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const socialAvatarUrl = useMemo(() => {
    const priority = ['github', 'atomgit'];
    for (const provider of priority) {
      const conn = socialConnections.find(
        (c) => c.is_connected && c.provider === provider && (c.username || c.uid),
      );
      if (!conn) continue;
      const url = inferDeveloperAvatarUrl(
        conn.provider,
        conn.username || conn.uid || '',
        conn.uid,
      );
      if (url) return url;
    }
    return '';
  }, [socialConnections]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-11 w-28" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-5">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[min(24rem,60dvh)] max-w-4xl items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <RefreshCw className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-balance">{t('profile.loadFailed')}</h1>
              <p className="text-sm text-muted-foreground text-pretty">{t('profile.loadFailedMsg')}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadProfile()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, profile, balance } = data;
  const pointsItems: PointsItem[] = [
    {
      key: 'total',
      label: t('profile.totalBalance'),
      value: balance.total,
      icon: Coins,
      tone: 'primary',
    },
    {
      key: 'cash',
      label: t('profile.cashPoints'),
      value: balance.cash,
      icon: Wallet,
      tone: 'cash',
    },
    {
      key: 'gift',
      label: t('profile.giftPoints'),
      value: balance.gift,
      icon: Gift,
      tone: 'gift',
    },
  ];
  const profileFacts = [
    profile.company
      ? {
          key: 'company',
          icon: Building2,
          label: profile.company,
        }
      : null,
    profile.location
      ? {
          key: 'location',
          icon: MapPin,
          label: profile.location,
        }
      : null,
    profile.birth_date && formatMonth(profile.birth_date)
      ? {
          key: 'birthday',
          icon: Calendar,
          label: `${t('profile.birthday')}：${formatMonth(profile.birth_date)}`,
        }
      : null,
  ].filter(Boolean) as { key: string; icon: LucideIcon; label: string }[];

  function handleConnectProvider(provider: string) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const accessToken = localStorage.getItem('access_token') ?? '';
    if (!accessToken) {
      toast.error(t('profile.loginExpired'));
      return;
    }
    const query = new URLSearchParams({ access_token: accessToken }).toString();
    window.open(
      `${baseUrl}/auth/social/${provider}/start?${query}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function handleOpenAddDialog() {
    setAddDialogOpen(true);
    if (!providersLoaded && !providersLoading) {
      void fetchAvailableProviders();
    }
  }

  function handleSelectProviderToBind(provider: string) {
    handleConnectProvider(provider);
    // OAuth 流程会在新标签页进行，关闭弹窗并提示用户
    setAddDialogOpen(false);
    toast.info(t('profile.bindOpenedInNewTab'));
  }

  async function handleDisconnectProvider(provider: string, associationId: number) {
    setDisconnectingId(associationId);
    try {
      await api.delete(`/auth/social/connections/${provider}/${associationId}`);
      toast.success(t('profile.unbindSuccess'));
      await fetchSocialConnections();
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('profile.unbindFailed'));
    } finally {
      setDisconnectingId(null);
    }
  }

  function renderSocialConnectionRow(
    conn: SocialConnectionItem,
    options: {
      compact?: boolean;
      confirmBeforeDisconnect?: boolean;
      style?: 'default' | 'signal' | 'ledger' | 'quiet';
    } = {},
  ) {
    const labelInfo = formatSocialAccountLabel(conn.username, conn.uid);
    const rowKey = conn.social_auth_id ?? `${conn.provider}-${conn.uid ?? ''}`;
    const canUnbind = conn.is_connected && conn.social_auth_id !== null;
    const isDisconnecting = disconnectingId === conn.social_auth_id;
    const style = options.style ?? 'default';
    const row = (

      <div
        key={rowKey}
        className={cn(
          'group grid min-w-0 gap-3 rounded-xl border p-3 transition-colors duration-150 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
          conn.is_connected
            ? 'border-border bg-secondary/20 hover:bg-secondary/35'
            : 'border-border bg-secondary/25 hover:bg-secondary/40',
        )}
      >
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card transition-colors duration-150',
              conn.is_connected
                ? 'border-primary/20 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            {getSocialProviderIcon(conn.provider)}
          </div>
          <div className="min-w-0 flex-1">

            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-medium text-foreground" title={conn.name}>
                {conn.name}
              </p>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none',
                  conn.is_connected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-foreground/60',
                )}
              >
                {conn.is_connected ? t('profile.alreadyBound') : t('profile.socialNotBound')}
              </span>
            </div>

            {conn.is_connected && labelInfo ? (
              conn.profile_url ? (
                <a
                  href={conn.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={labelInfo.full}
                  className="mt-1 inline-flex min-h-11 max-w-full items-center truncate rounded-md text-xs font-medium text-foreground/65 outline-none transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {labelInfo.display}
                </a>
              ) : (
                <span
                  title={labelInfo.full}
                  className="mt-1 block truncate text-xs text-foreground/65"
                >
                  {labelInfo.display}
                </span>
              )
            ) : (
              <p className="mt-1 text-xs text-foreground/55">{t('profile.addAccount')}</p>
            )}
          </div>
        </div>
        {canUnbind ? (
          options.confirmBeforeDisconnect ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 border-border bg-card text-foreground/70 hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive"
                  disabled={!canDisconnectSocial || isDisconnecting}
                  aria-label={t('profile.unbind')}
                >
                  {isDisconnecting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Unlink className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('profile.confirmUnbindTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('profile.confirmUnbindDesc', { name: conn.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      handleDisconnectProvider(
                        conn.provider,
                        conn.social_auth_id as number,
                      )
                    }
                  >
                    {t('profile.confirmUnbind')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shrink-0 border-border bg-card text-foreground/70 hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive"
              disabled={!canDisconnectSocial || isDisconnecting}
              aria-label={t('profile.unbind')}
              onClick={() =>
                handleDisconnectProvider(
                  conn.provider,
                  conn.social_auth_id as number,
                )
              }
            >
              {isDisconnecting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Unlink className="size-4" aria-hidden="true" />
              )}
            </Button>
          )
        ) : null}
      </div>

    );

    return row;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{t('profile.title')}</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/70 text-pretty">{t('profile.basicInfo')}</p>
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link to="/profile/edit">
            <Pencil className="size-4" aria-hidden="true" />
            {t('profile.editProfile')}
          </Link>
        </Button>
      </div>

      <Card className="relative overflow-hidden border-primary/20 bg-card/95">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden="true"
        >
          <div className="absolute -left-24 -top-24 size-64 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute right-0 top-0 h-40 w-72 bg-[image:var(--profile-blue-field)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
        <CardContent className="relative p-4 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)] lg:items-end">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="size-20 shrink-0 border border-primary/25 bg-background shadow-sm ring-4 ring-primary/10 sm:size-24">
                {socialAvatarUrl && (
                  <AvatarImage src={socialAvatarUrl} alt={user.username || ''} />
                )}
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary sm:text-3xl">
                  {(user.username?.charAt(0) || '?').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-4">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" title={user.username}>
                    {user.username}
                  </p>
                  <div className="flex min-w-0 items-center gap-2 text-sm text-foreground/65">
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate" title={user.email}>{user.email}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-foreground/70">
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    <User className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{user.username}</span>
                  </span>
                  {profileFacts.map((fact) => {
                    const Icon = fact.icon;
                    return (
                      <span
                        key={fact.key}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary/55 px-2.5 py-1"
                        title={fact.label}
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{fact.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {pointsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={cn(
                      'min-w-0 rounded-xl border p-3.5 transition-colors duration-150',
                      item.tone === 'primary' && 'border-primary/25 bg-primary/10',
                      item.tone === 'cash' && 'border-chart-2/25 bg-chart-2/10',
                      item.tone === 'gift' && 'border-chart-4/25 bg-chart-4/10',
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          item.tone === 'primary' && 'text-primary',
                          item.tone === 'cash' && 'text-chart-2',
                          item.tone === 'gift' && 'text-chart-4',
                        )}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="truncate font-mono text-xl font-semibold tabular-nums text-foreground" title={String(item.value)}>
                      {formatPoints(item.value)}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-foreground/65 text-pretty">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-5">
          <Card className="bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <User className="size-4" aria-hidden="true" />
                </span>
                {t('profile.bio')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {profile.bio ? (
                <p className="max-w-3xl leading-7 text-foreground/85 text-pretty break-words">
                  {profile.bio}
                </p>
              ) : null}
              {profileFacts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {profileFacts.map((fact) => {
                    const Icon = fact.icon;
                    return (
                      <div
                        key={fact.key}
                        className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-foreground/70"
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="break-words">{fact.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {!profile.bio && profileFacts.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground italic">{t('profile.noBio')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg border border-chart-2/20 bg-chart-2/10 text-chart-2">
                  <Briefcase className="size-4" aria-hidden="true" />
                </span>
                {t('profile.workExperience')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workExperiences.length > 0 ? (
                <div className="space-y-3">
                  {workExperiences.map((exp) => (
                    <div key={exp.id} className="rounded-xl border border-border bg-secondary/25 p-4 transition-colors duration-150 hover:border-chart-2/35 hover:bg-secondary/40">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="break-words font-medium text-foreground">{exp.company_name}</p>
                          {exp.description ? (
                            <p className="text-sm text-foreground/70 text-pretty break-words">
                              {exp.description}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant="secondary" className="max-w-full border border-chart-2/20 bg-chart-2/10 text-left text-chart-2">
                          {exp.title}
                        </Badge>
                      </div>
                      <p className="mt-3 font-mono text-xs text-foreground/60">
                        {formatMonth(exp.start_date)} - {exp.end_date ? formatMonth(exp.end_date) : t('common.present')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground italic">{t('profile.noWorkExperience')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg border border-chart-4/20 bg-chart-4/10 text-chart-4">
                  <GraduationCap className="size-4" aria-hidden="true" />
                </span>
                {t('profile.education')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {educations.length > 0 ? (
                <div className="space-y-3">
                  {educations.map((edu) => (
                    <div key={edu.id} className="rounded-xl border border-border bg-secondary/25 p-4 transition-colors duration-150 hover:border-chart-4/35 hover:bg-secondary/40">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="break-words font-medium text-foreground">{edu.institution_name}</p>
                          <p className="text-sm text-foreground/70 break-words">{edu.field_of_study}</p>
                        </div>
                        <Badge variant="secondary" className="max-w-full border border-chart-4/20 bg-chart-4/10 text-left text-chart-4">
                          {edu.degree}
                        </Badge>
                      </div>
                      <p className="mt-3 font-mono text-xs text-foreground/60">
                        {formatMonth(edu.start_date)} - {edu.end_date ? formatMonth(edu.end_date) : t('common.present')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4">
                  <p className="text-sm text-muted-foreground italic">{t('profile.noEducation')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Card className="gap-0 border-border bg-card/95">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">{t('profile.socialAccounts')}</CardTitle>
                </div>
                <div className="rounded-lg border border-border bg-secondary/35 px-2.5 py-1 font-mono text-xs text-foreground/70">
                  {connectedSocialCount}/{socialConnections.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-between bg-background/60"
                onClick={handleOpenAddDialog}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" aria-hidden="true" />
                  {t('profile.addAccount')}
                </span>
                <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
              </Button>
              {socialConnections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground italic">{t('profile.socialNotBound')}</p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  {socialConnections.map((conn) =>
                    renderSocialConnectionRow(conn, {
                      confirmBeforeDisconnect: true,
                      style: 'ledger',
                    }),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* 添加社交账号弹窗 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden border-primary/20 bg-popover p-4 shadow-[var(--overlay-shadow)] sm:max-w-2xl sm:p-6">
          <DialogHeader className="pr-12 sm:pr-10">
            <DialogTitle>{t('profile.addAccountTitle')}</DialogTitle>
            <DialogDescription className="text-foreground/70">{t('profile.addAccountDesc')}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
            {/* 已绑定账号清单（与外部卡片一致的 login(id) 展示） */}
            <section>
              <h4 className="mb-2 text-sm font-semibold text-foreground/85">
                {t('profile.boundAccountsHeading')}
              </h4>
              {socialConnections.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('profile.socialNotBound')}
                </p>
              ) : (
                <div className="space-y-2">
                  {socialConnections.map((conn) =>
                    renderSocialConnectionRow(conn, { compact: true }),
                  )}
                </div>
              )}
            </section>

            {/* 可绑定的 providers（全部可点，支持同一平台多次绑定） */}
            <section>
              <h4 className="mb-2 text-sm font-semibold text-foreground/85">
                {t('profile.bindablePlatformsHeading')}
              </h4>
              {providersLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status">
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : availableProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  {t('profile.noProvidersAvailable')}
                </p>
              ) : (
                <div className="grid gap-2">
                  {availableProviders.map((provider) => {
                    const boundCount = socialConnections.filter(
                      (c) => c.provider === provider.provider,
                    ).length;
                    return (
                      <Button
                        key={provider.provider}
                        type="button"
                        variant="outline"
                        className="min-h-11 justify-between py-2.5"
                        onClick={() => handleSelectProviderToBind(provider.provider)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted shrink-0">
                            {getSocialProviderIcon(provider.provider)}
                          </span>
                          <span className="truncate font-medium">{provider.name}</span>
                          {boundCount > 0 && (
                            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                              {t('profile.boundCountBadge', { count: boundCount })}
                            </Badge>
                          )}
                        </span>
                        <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
          <p className="rounded-lg border border-border bg-secondary/25 p-3 text-xs leading-5 text-foreground/65 text-pretty">
            {t('profile.addAccountTip')}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

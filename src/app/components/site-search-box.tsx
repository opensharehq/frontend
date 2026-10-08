import { useState, useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Search, Loader2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface SearchResultItem {
  // For repo/user rows this is the source platform (github/gitee/...).
  // For label rows this carries the label type (Project / Company / ...).
  platform: string;
  // Numeric for repo/user, canonical ':companies/...'-style string for labels.
  id: number | string;
  name: string;
  name_zh?: string;
  type: string;
}

type Variant = 'landing' | 'insight';

const OPEN_DIGGER_LOGO_BASE = 'https://oss.open-digger.cn/logos/';
const SEARCH_LABEL_TYPE_MAP: Record<string, { en: string; zh: string }> = {
  repo: { en: 'Repo', zh: '仓库' },
  Project: { en: 'Project', zh: '项目' },
  Company: { en: 'Company', zh: '公司' },
  'University-0': { en: 'University', zh: '高校' },
  'Institution-0': { en: 'Institution', zh: '研究机构' },
  Foundation: { en: 'Foundation', zh: '基金会' },
  'Agency-0': { en: 'Agency', zh: '政府机构' },
  'Tech-0': { en: 'Tech', zh: '技术领域' },
  'Division-0': { en: 'Country', zh: '国家' },
  'Division-1': { en: 'Province', zh: '省份' },
  Community: { en: 'Community', zh: '社区' },
};

interface SiteSearchBoxProps {
  /**
   * Visual variant.
   * - 'landing': plain input, no decorative glow (caller controls outer container).
   * - 'insight': self-contained block with subtle background glow and rounded-xl input.
   */
  variant?: Variant;
  /** Query string copied to insight detail routes (for example leaderboard filters). */
  navigationSearch?: string;
}

/**
 * Unified site-wide search box used on the landing hero section and the
 * insight (leaderboard) page. Renders an input with debounced /public/search
 * lookup and a two-column dropdown (Repositories | Developers) with type
 * labels in column headers.
 */
// Resolve a flatten_labels.type value (e.g. 'Project', 'Company',
// 'Division', 'Tech') to a localized display name from LABEL_TYPE_MAP.
// flatten_labels stores types without the '-0' suffix that LABEL_TYPE_MAP
// uses for division/tech/university/institution/agency, so try several
// candidate keys before falling back to the raw value.
function resolveLabelTypeDisplay(rawType: string, lang: 'zh' | 'en'): string {
  if (!rawType) return lang === 'zh' ? '标签' : 'Label';
  const cap = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
  const candidates = [rawType, `${rawType}-0`, cap, `${cap}-0`, rawType.toLowerCase()];
  for (const key of candidates) {
    const entry = SEARCH_LABEL_TYPE_MAP[key];
    if (entry) return lang === 'zh' ? entry.zh : entry.en;
  }
  return rawType;
}

function normalizeSearchPlatform(platform: unknown): string {
  if (platform == null || String(platform).trim() === '') return 'github';
  const raw = String(platform).trim();
  const lower = raw.toLowerCase().replace(/\/$/, '');
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const host = new URL(lower).hostname.replace(/^www\./, '');
      if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) return 'gitlab';
      if (host === 'atomgit.com' || host.endsWith('.atomgit.com')) return 'atomgit';
      if (host === 'gitee.com') return 'gitee';
      if (host === 'github.com') return 'github';
    } catch {
      /* fall through */
    }
  }
  const slug = lower.replace(/\.com\/?$/, '').replace(/[^a-z0-9]+/g, '');
  if (slug === 'gitlab' || lower.includes('gitlab')) return 'gitlab';
  if (slug === 'atomgit' || lower.includes('atomgit')) return 'atomgit';
  if (slug === 'gitee' || lower.includes('gitee')) return 'gitee';
  if (slug === 'github') return 'github';
  return lower.replace(/\.com$/, '').split('/')[0] || 'github';
}

function inferSearchLabelAvatarUrl(labelIdFull: string | null | undefined): string {
  if (!labelIdFull || typeof labelIdFull !== 'string') return '';
  const path = labelIdFull.startsWith(':') || labelIdFull.startsWith('#')
    ? labelIdFull.slice(1)
    : labelIdFull;
  return path ? `${OPEN_DIGGER_LOGO_BASE}${path}.png` : '';
}

function PlatformMark({ platform }: { platform: unknown }) {
  const normalized = normalizeSearchPlatform(platform);
  if (normalized === 'github') {
    return <Github className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />;
  }
  return (
    <img
      src={`${OPEN_DIGGER_LOGO_BASE}${normalized}.png`}
      alt=""
      className="size-3.5 shrink-0 object-contain"
      width={14}
      height={14}
      decoding="async"
    />
  );
}

export function SiteSearchBox({ variant = 'landing', navigationSearch = '' }: SiteSearchBoxProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').startsWith('zh') ? 'zh' : 'en';
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Disable search on landing page until user is authenticated
  const isDisabled = variant === 'landing' && !authLoading && !isAuthenticated;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsId = useId();

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2 || isDisabled) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      // Cancel previous in-flight request to avoid backend concurrency errors
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      try {
        const { data } = await api.get<{ items: SearchResultItem[] }>(
          `/public/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        setSearchResults(
          data.items.filter((item) => {
            const typeLower = (item.type || '').toLowerCase();
            return typeLower === 'repo' || typeLower === 'user' || typeLower === 'label';
          }),
        );
        setShowResults(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'CanceledError') return;
        setSearchResults([]);
        setShowResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [searchQuery, isDisabled]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleResultClick(item: SearchResultItem) {
    const itemType = (item.type || '').toLowerCase();
    let detailPath: string;
    if (itemType === 'repo') {
      const [owner, repo] = item.name.split('/');
      detailPath = `/insight/${item.platform}/${owner}/${repo}`;
    } else if (itemType === 'label') {
      // flatten_labels.id is canonical ':companies/huawei/ascend'; the label
      // detail route expects the path without the leading ':' prefix.
      const labelPath = String(item.id || '').replace(/^[:#]/, '');
      detailPath = `/insight/labels/${labelPath}`;
    } else {
      detailPath = `/insight/${item.platform}/${item.name}`;
    }
    const query = navigationSearch.replace(/^\?/, '');
    navigate(query ? `${detailPath}?${query}` : detailPath);
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  function getResultButtons() {
    return Array.from(
      searchContainerRef.current?.querySelectorAll<HTMLButtonElement>('[data-search-result]') ?? [],
    );
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setShowResults(false);
      return;
    }
    if (event.key === 'ArrowDown' && showResults) {
      const [firstResult] = getResultButtons();
      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }
  }

  function handleResultKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowResults(false);
      searchInputRef.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = getResultButtons();
    const index = buttons.indexOf(event.currentTarget);
    if (index === -1) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'ArrowDown'
        ? Math.min(index + 1, buttons.length - 1)
        : Math.max(index - 1, 0);
    buttons[nextIndex]?.focus();
  }

  const placeholderKey = isDisabled
    ? 'hero.search.placeholder.unauthenticated'
    : 'hero.search.placeholder';

  const inputClass =
    variant === 'insight'
      ? 'h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring'
      : `h-12 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring${isDisabled ? ' cursor-not-allowed opacity-60' : ''}`;

  const repoResults = searchResults.filter(
    (item) => (item.type || '').toLowerCase() === 'repo',
  );
  const userResults = searchResults.filter(
    (item) => (item.type || '').toLowerCase() === 'user',
  );
  const labelResults = searchResults.filter(
    (item) => (item.type || '').toLowerCase() === 'label',
  );

  const getDisplayName = (item: SearchResultItem) =>
    lang === 'zh' && item.name_zh ? item.name_zh : item.name;

  const renderItem = (item: SearchResultItem) => (
    <button
      type="button"
      key={`${item.platform}-${item.type}-${item.id}`}
      data-search-result
      className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-secondary/70 focus-visible:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => handleResultClick(item)}
      onKeyDown={handleResultKeyDown}
    >
      <PlatformMark platform={item.platform} />
      <span className="truncate text-xs text-foreground">{getDisplayName(item)}</span>
    </button>
  );

  // Label rows reuse the avatar construction from the label detail page so
  // the same OSS logo path (https://oss.open-digger.cn/logos/...) is shown.
  const renderLabelItem = (item: SearchResultItem) => {
    const rawLabelId = String(item.id || '');
    const avatarUrl = inferSearchLabelAvatarUrl(rawLabelId);
    const rawType = item.platform || '';
    const typeDisplay = resolveLabelTypeDisplay(rawType, lang);
    return (
      <button
        type="button"
        key={`label-${rawLabelId}`}
        data-search-result
        className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-secondary/70 focus-visible:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => handleResultClick(item)}
        onKeyDown={handleResultKeyDown}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-4 rounded-sm bg-background object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Tag className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{getDisplayName(item)}</span>
        {typeDisplay && (
          <span className="inline-flex shrink-0 items-center rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {typeDisplay}
          </span>
        )}
      </button>
    );
  };

  const columnHeader = (label: string, count: number) => (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-2.5 py-1 font-mono text-[11px] font-semibold uppercase text-muted-foreground">
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );

  const emptyCol = (
    <div className="select-none px-2.5 py-2 text-left text-xs text-muted-foreground">-</div>
  );

  const inputAndDropdown = (
    <div className={`relative w-full ${showResults || isSearching ? 'z-50' : 'z-10'}`} ref={searchContainerRef}>
      <Search className="absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        disabled={isDisabled}
        aria-label={t('hero.search.ariaLabel')}
        aria-expanded={showResults}
        aria-controls={showResults ? resultsId : undefined}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (searchQuery.trim()) setShowResults(true);
        }}
        onKeyDown={handleInputKeyDown}
        placeholder={t(placeholderKey)}
        className={inputClass}
      />

      {/* Search results dropdown */}
      {showResults && !isSearching && searchQuery.trim() && (
        <div
          id={resultsId}
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="dark-scrollbar flex max-h-[220px] flex-col overflow-y-auto overscroll-contain">
                {columnHeader(t('hero.search.typeRepo'), repoResults.length)}
                {repoResults.length > 0 ? repoResults.map(renderItem) : emptyCol}
              </div>
              <div className="dark-scrollbar flex max-h-[220px] flex-col overflow-y-auto overscroll-contain">
                {columnHeader(t('hero.search.typeUser'), userResults.length)}
                {userResults.length > 0 ? userResults.map(renderItem) : emptyCol}
              </div>
              <div className="dark-scrollbar flex max-h-[220px] flex-col overflow-y-auto overscroll-contain">
                {columnHeader(t('hero.search.typeLabel'), labelResults.length)}
                {labelResults.length > 0 ? labelResults.map(renderLabelItem) : emptyCol}
              </div>
            </div>
          ) : (
            <div className="select-none px-4 py-3 text-left text-sm text-muted-foreground" aria-live="polite">
              {t('hero.search.noResults')}
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 flex items-center gap-2 rounded-xl border border-border bg-popover px-4 py-3 shadow-xl" aria-live="polite">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
        </div>
      )}
    </div>
  );

  if (variant === 'insight') {
    return (
      <div className="px-0 py-2">
        <div className="mx-auto flex w-full max-w-4xl justify-center">{inputAndDropdown}</div>
      </div>
    );
  }

  // landing variant — outer layout (centering / margins) is controlled by caller
  return inputAndDropdown;
}

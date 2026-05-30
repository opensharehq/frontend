import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react/offline';
import { getInsightHomePath } from '../domain/routes';

type InsightDetailNavProps = {
  homeLabel: string;
  sectionLabel: string;
  currentLabel: string;
  backLabel: string;
};

export function InsightDetailNav({
  homeLabel,
  sectionLabel,
  currentLabel,
  backLabel,
}: InsightDetailNavProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label={homeLabel} className="min-w-0 text-sm text-muted-foreground">
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
          <li>
            <Link
              to={getInsightHomePath()}
              className="rounded-md transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {homeLabel}
            </Link>
          </li>
          <li className="text-muted-foreground/70" aria-hidden>
            /
          </li>
          <li className="text-muted-foreground">{sectionLabel}</li>
          <li className="text-muted-foreground/70" aria-hidden>
            /
          </li>
          <li className="min-w-0 max-w-full break-all font-medium text-foreground" aria-current="page">
            {currentLabel}
          </li>
        </ol>
      </nav>

      <Link
        to={getInsightHomePath()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
      >
        <Icon icon="mdi:arrow-left" className="size-4" aria-hidden />
        <span>{backLabel}</span>
      </Link>
    </div>
  );
}

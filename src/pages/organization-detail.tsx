import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Building2, Globe, MapPin, Calendar, Users, Settings, Crown, Shield, Loader2, Send, Receipt } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import {
  PointsBalanceCard,
  type PointsBalanceData,
} from '@/app/components/points-balance-card';

interface OrgDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  website: string;
  location: string;
  avatar_url: string;
  member_count: number;
  current_user_role: string;
  balance: PointsBalanceData | null;
  created_at: string;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <Badge className="bg-purple-600 text-white border-transparent">
          <Crown className="size-3" />
          Owner
        </Badge>
      );
    case 'admin':
      return (
        <Badge className="bg-blue-600 text-white border-transparent">
          <Shield className="size-3" />
          Admin
        </Badge>
      );
    default:
      return <Badge variant="secondary">Member</Badge>;
  }
}

export default function OrganizationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.get(`/organizations/${slug}`)
      .then(({ data }) => {
        const organization = data?.organization ?? {};
        setOrg({
          id: organization.id,
          name: organization.name ?? '',
          slug: organization.slug ?? '',
          description: organization.description ?? '',
          website: organization.website ?? '',
          location: organization.location ?? '',
          avatar_url: organization.avatar_url ?? '',
          created_at: organization.created_at ?? '',
          member_count: data?.member_count ?? 0,
          current_user_role: data?.membership?.role ?? '',
          balance: data?.balance ?? null,
        });
      })
      .catch((error) => {
        const apiError = getApiError(error);
        toast.error(apiError.message || t('organizations.loadDetailFailed'));
      })
      .finally(() => setLoading(false));
  }, [slug, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Building2 className="size-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t('organizations.notFound')}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/organizations">{t('organizations.backToList')}</Link>
        </Button>
      </div>
    );
  }

  const isAdminOrOwner = org.current_user_role === 'owner' || org.current_user_role === 'admin';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Organization Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="size-20 shrink-0">
              {org.avatar_url && <AvatarImage src={org.avatar_url} alt={org.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{org.name}</h1>
                {getRoleBadge(org.current_user_role)}
              </div>
              {org.description && (
                <p className="text-muted-foreground">{org.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Globe className="size-3.5" />
                    {org.website}
                  </a>
                )}
                {org.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {org.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {t('organizations.createdAt', { date: format(new Date(org.created_at), 'yyyy-MM-dd') })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {t('organizations.memberCount', { count: org.member_count })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isAdminOrOwner && (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/points/allocate">
              <Send className="size-4" />
              {t('organizations.allocatePoints')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/organizations/${slug}/transactions`}>
              <Receipt className="size-4" />
              {t('organizations.transactions')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/organizations/${slug}/members`}>
              <Users className="size-4" />
              {t('organizations.memberManagement')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/organizations/${slug}/settings`}>
              <Settings className="size-4" />
              {t('organizations.orgSettings')}
            </Link>
          </Button>
        </div>
      )}

      {/* 积分总览与礼物积分明细 */}
      {org.balance && isAdminOrOwner && (
        <PointsBalanceCard balance={org.balance} />
      )}
    </div>
  );
}

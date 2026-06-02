import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Users, Loader2 } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';

interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  website: string;
  location: string;
  avatar_url: string;
  role: string;
  member_count: number;
  joined_at: string;
}

interface OrganizationListItem extends Organization {
  membership?: { role?: string; joined_at?: string } | null;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return <Badge className="bg-purple-600 text-white border-transparent">Owner</Badge>;
    case 'admin':
      return <Badge className="bg-blue-600 text-white border-transparent">Admin</Badge>;
    default:
      return <Badge variant="secondary">Member</Badge>;
  }
}

export default function OrganizationsPage() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/organizations/')
      .then(({ data }) => {
        const items: OrganizationListItem[] = data?.items ?? data ?? [];
        setOrganizations(
          items.map((item) => ({
            id: item.id,
            name: item.name ?? '',
            slug: item.slug ?? '',
            description: item.description ?? '',
            website: item.website ?? '',
            location: item.location ?? '',
            avatar_url: item.avatar_url ?? '',
            role: item.membership?.role ?? item.role ?? '',
            joined_at: item.membership?.joined_at ?? item.joined_at ?? '',
            member_count: item.member_count ?? 0,
          })),
        );
      })
      .catch((error) => {
        const apiError = getApiError(error);
        toast.error(apiError.message || t('organizations.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('organizations.title')}</h1>
        <Button asChild>
          <Link to="/organizations/create">
            <Plus className="size-4" />
            {t('organizations.createOrg')}
          </Link>
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">{t('organizations.noOrgs')}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/organizations/create">
                <Plus className="size-4" />
                {t('organizations.createFirstOrg')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => (
            <Link key={org.id} to={`/organizations/${org.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="flex gap-4 p-6">
                  <Avatar className="size-12 shrink-0">
                    {org.avatar_url && <AvatarImage src={org.avatar_url} alt={org.name} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {org.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{org.name}</h3>
                      {getRoleBadge(org.role)}
                    </div>
                    {org.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {org.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="size-3.5" />
                      <span>{t('organizations.memberCount', { count: org.member_count })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

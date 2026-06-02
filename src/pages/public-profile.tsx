import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Building2,
  Github,
  Globe,
  BookOpen,
  Twitter,
  Linkedin,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';

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

interface PublicProfileData {
  username: string;
  display_name: string;
  company: string;
  location: string;
  bio: string;
  avatar_url: string;
  github_url: string;
  homepage_url: string;
  blog_url: string;
  twitter_url: string;
  linkedin_url: string;
  work_experiences: WorkExperience[];
  educations: Education[];
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    api.get(`/public/users/${username}`)
      .then(({ data }) => setData(data))
      .catch((error) => {
        const apiError = getApiError(error);
        if (apiError.code === 'not_found' || (error as { response?: { status: number } }).response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error(apiError.message || t('publicProfile.loadFailedMsg'));
        }
      })
      .finally(() => setLoading(false));
  }, [username, t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">{t('publicProfile.notFound')}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t('publicProfile.notFoundDesc', { username })}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground text-center">{t('publicProfile.loadFailed')}</p>
      </div>
    );
  }

  const socialLinks = [
    { url: data.github_url, icon: Github, label: 'GitHub' },
    { url: data.homepage_url, icon: Globe, label: t('publicProfile.homepage') },
    { url: data.blog_url, icon: BookOpen, label: t('publicProfile.blog') },
    { url: data.twitter_url, icon: Twitter, label: 'Twitter' },
    { url: data.linkedin_url, icon: Linkedin, label: 'LinkedIn' },
  ].filter(link => link.url);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 头部信息 */}
      <div className="flex items-start gap-5">
        <Avatar className="size-20">
          <AvatarImage src={data.avatar_url} alt={data.display_name || data.username} />
          <AvatarFallback className="text-2xl">
            {(data.display_name || data.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-bold">{data.display_name || data.username}</h1>
            <p className="text-sm text-muted-foreground">@{data.username}</p>
          </div>
          {data.bio && <p className="text-sm">{data.bio}</p>}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {data.company && (
              <span className="flex items-center gap-1">
                <Building2 className="size-4" />
                {data.company}
              </span>
            )}
            {data.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {data.location}
              </span>
            )}
          </div>
          {/* 社交链接图标行 */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={link.label}
                >
                  <link.icon className="size-5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 工作经历 */}
      {data.work_experiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="size-4" />
              {t('profile.workExperience')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {data.work_experiences.map((exp) => (
                <div key={exp.id} className="relative">
                  <div className="absolute -left-6 top-1.5 size-3 rounded-full border-2 border-primary bg-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exp.company_name}</span>
                      <Badge variant="secondary">{exp.title}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(exp.start_date), 'yyyy-MM')} -{' '}
                      {exp.end_date ? format(new Date(exp.end_date), 'yyyy-MM') : t('common.present')}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 教育背景 */}
      {data.educations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="size-4" />
              {t('profile.education')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {data.educations.map((edu) => (
                <div key={edu.id} className="relative">
                  <div className="absolute -left-6 top-1.5 size-3 rounded-full border-2 border-primary bg-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{edu.institution_name}</span>
                      <Badge variant="secondary">{edu.degree}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{edu.field_of_study}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(edu.start_date), 'yyyy-MM')} -{' '}
                      {edu.end_date ? format(new Date(edu.end_date), 'yyyy-MM') : t('common.present')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 如果没有工作和教育经历 */}
      {data.work_experiences.length === 0 && data.educations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{t('publicProfile.noMoreInfo')}</p>
        </div>
      )}
    </div>
  );
}

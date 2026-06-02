import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Upload, Trash2, AlertTriangle } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import { Separator } from '@/app/components/ui/separator';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/app/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

export default function OrganizationSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settingsSchema = z.object({
    name: z.string().min(2, t('organizations.orgNameMin2')).max(100, t('organizations.orgNameMax100')),
    description: z.string().optional(),
    website: z
      .string()
      .url(t('organizations.validUrl'))
      .optional()
      .or(z.literal('')),
    location: z.string().optional(),
  });

  type SettingsFormValues = z.infer<typeof settingsSchema>;

interface OrgInfo {
  id: number;
  name: string;
  slug: string;
  description: string;
  website: string;
  location: string;
  avatar_url: string;
}

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [deleting, setDeleting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      description: '',
      website: '',
      location: '',
    },
  });

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
        });
        form.reset({
          name: organization.name || '',
          description: organization.description || '',
          website: organization.website || '',
          location: organization.location || '',
        });
      })
      .catch((error) => {
        const apiError = getApiError(error);
        toast.error(apiError.message || t('orgSettings.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [slug, form, t]);

  async function onSubmit(values: SettingsFormValues) {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        website: values.website || undefined,
        location: values.location || undefined,
      };
      const { data } = await api.patch(`/organizations/${slug}`, payload);
      const organization = data?.organization ?? data ?? {};
      setOrg((prev) => prev ? {
        ...prev,
        name: organization.name ?? prev.name,
        slug: organization.slug ?? prev.slug,
        description: organization.description ?? prev.description,
        website: organization.website ?? prev.website,
        location: organization.location ?? prev.location,
        avatar_url: organization.avatar_url ?? prev.avatar_url,
      } : prev);
      toast.success(t('orgSettings.orgUpdated'));
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgSettings.orgUpdateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post(`/organizations/${slug}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOrg((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : prev);
      toast.success(t('orgSettings.avatarUploadSuccess'));
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgSettings.avatarUploadFailed'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteAvatar() {
    setDeletingAvatar(true);
    try {
      await api.delete(`/organizations/${slug}/avatar`);
      setOrg((prev) => prev ? { ...prev, avatar_url: '' } : prev);
      toast.success(t('orgSettings.avatarDeleted'));
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgSettings.avatarDeleteFailed'));
    } finally {
      setDeletingAvatar(false);
    }
  }

  async function handleDeleteOrg() {
    setDeleting(true);
    try {
      await api.delete(`/organizations/${slug}`, {
        data: { confirm_slug: deleteConfirmSlug },
      });
      toast.success(t('orgSettings.orgDeleted'));
      navigate('/organizations');
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgSettings.deleteOrgFailed'));
    } finally {
      setDeleting(false);
    }
  }

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
        <p className="text-muted-foreground">{t('orgSettings.notFound')}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/organizations">{t('orgSettings.backToList')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
          <Link to={`/organizations/${slug}`}>
            <ArrowLeft className="size-4" />
            {t('orgTransactions.backToOrg')}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{t('orgSettings.title')}</h1>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('orgSettings.basicInfo')}</CardTitle>
          <CardDescription>{t('orgSettings.basicInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orgSettings.orgName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orgSettings.description')}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orgSettings.website')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orgSettings.location')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('orgSettings.locationPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {t('orgSettings.saveChanges')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Avatar Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('orgSettings.orgAvatar')}</CardTitle>
          <CardDescription>{t('orgSettings.orgAvatarDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="size-20">
              {org.avatar_url && <AvatarImage src={org.avatar_url} alt={org.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('orgSettings.uploadNewAvatar')}
              </Button>
              {org.avatar_url && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteAvatar}
                  disabled={deletingAvatar}
                >
                  {deletingAvatar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {t('orgSettings.deleteAvatar')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {t('orgSettings.dangerZone')}
          </CardTitle>
          <CardDescription>
            {t('orgSettings.dangerZoneDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('orgSettings.deleteOrg')}</p>
              <p className="text-sm text-muted-foreground">
                {t('orgSettings.deleteOrgDesc')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="size-4" />
              {t('orgSettings.deleteOrg')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orgSettings.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orgSettings.confirmDeleteDesc', { slug })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('orgSettings.confirmDeletePlaceholder', { slug })}
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmSlug('')}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrg}
              disabled={deleteConfirmSlug !== slug || deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('messages.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { getIsMainlandCn } from '@/lib/geo';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/app/components/ui/form';

interface Address {
  id: number;
  receiver_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}

const phoneRegex = /^1[3-9]\d{9}$/;

export default function AddressesPage() {
  const { t } = useTranslation();
  const isMainlandCn = getIsMainlandCn();

  const addressSchema = z.object({
    receiver_name: z.string().min(1, t('addresses.enterReceiver')),
    phone: z.string().min(1, t('addresses.enterPhone')).regex(phoneRegex, t('addresses.validPhone')),
    province: z.string().min(1, t('addresses.enterProvince')),
    city: z.string().min(1, t('addresses.enterCity')),
    district: z.string().min(1, t('addresses.enterDistrict')),
    address: z.string().min(1, t('addresses.enterAddress')),
  });

  type AddressFormValues = z.infer<typeof addressSchema>;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      receiver_name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      address: '',
    },
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/me/shipping-addresses');
      setAddresses(data.items ?? data ?? []);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  function openCreateDialog() {
    setEditingAddress(null);
    form.reset({
      receiver_name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      address: '',
    });
    setDialogOpen(true);
  }

  function openEditDialog(addr: Address) {
    setEditingAddress(addr);
    form.reset({
      receiver_name: addr.receiver_name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      address: addr.address,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: AddressFormValues) {
    setIsSubmitting(true);
    try {
      if (editingAddress) {
        await api.patch(`/me/shipping-addresses/${editingAddress.id}`, values);
        toast.success(t('addresses.addressUpdated'));
      } else {
        await api.post('/me/shipping-addresses', values);
        toast.success(t('addresses.addressAdded'));
      }
      setDialogOpen(false);
      await fetchAddresses();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.operationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(addr: Address) {
    try {
      await api.delete(`/me/shipping-addresses/${addr.id}`);
      toast.success(t('addresses.deleteSuccess'));
      setDeleteTarget(null);
      await fetchAddresses();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.deleteFailed'));
    }
  }

  async function handleSetDefault(addr: Address) {
    try {
      await api.post(`/me/shipping-addresses/${addr.id}/set-default`);
      toast.success(t('addresses.setDefaultSuccess'));
      await fetchAddresses();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('addresses.setDefaultFailed'));
    }
  }

  if (!isMainlandCn) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4 text-center">
        <MapPin className="mx-auto size-10 text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold mb-2">{t('addresses.title')}</h1>
        <p className="text-muted-foreground">{t('addresses.regionNotSupported')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">{t('addresses.title')}</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          {t('addresses.addAddress')}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('addresses.noAddresses')}</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {t('addresses.addFirstAddress')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card key={addr.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{addr.receiver_name}</CardTitle>
                    <span className="text-sm text-muted-foreground">{addr.phone}</span>
                    {addr.is_default && (
                      <Badge variant="default" className="text-xs">{t('common.default')}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {addr.province} {addr.city} {addr.district} {addr.address}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(addr)}
                  >
                    <Pencil className="size-3.5" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(addr)}
                  >
                    <Trash2 className="size-3.5" />
                    {t('common.delete')}
                  </Button>
                  {!addr.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(addr)}
                    >
                      <Star className="size-3.5" />
                      {t('addresses.setDefault')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加/编辑 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? t('addresses.editAddress') : t('addresses.addAddress')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="receiver_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addresses.receiver')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('addresses.receiverPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addresses.phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('addresses.phonePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addresses.province')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('addresses.provincePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addresses.city')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('addresses.cityPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addresses.district')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('addresses.districtPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addresses.detailAddress')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('addresses.detailAddressPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  {editingAddress ? t('addresses.saveBtn') : t('addresses.addBtn')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('addresses.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('addresses.confirmDeleteDesc', { name: deleteTarget?.receiver_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              {t('addresses.confirmDeleteBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

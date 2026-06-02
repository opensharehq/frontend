import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Trash2, Crown, Shield, User, Loader2 } from 'lucide-react';
import api, { getApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/app/components/ui/table';
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';

interface MemberUser {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
}

interface Member {
  id: number;
  user: MemberUser;
  role: string;
  joined_at: string;
}

const ROLE_HIERARCHY: Record<string, number> = { owner: 3, admin: 2, member: 1 };

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="size-3" />;
    case 'admin':
      return <Shield className="size-3" />;
    default:
      return <User className="size-3" />;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <Badge className="bg-purple-600 text-white border-transparent">
          {getRoleIcon(role)} Owner
        </Badge>
      );
    case 'admin':
      return (
        <Badge className="bg-blue-600 text-white border-transparent">
          {getRoleIcon(role)} Admin
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          {getRoleIcon(role)} Member
        </Badge>
      );
  }
}

export default function OrganizationMembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addRole, setAddRole] = useState('member');
  const [addLoading, setAddLoading] = useState(false);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const currentMember = members.find((m) => m.user.id === currentUser?.id);
  const currentRole = currentMember?.role || 'member';
  const ownerCount = members.filter((m) => m.role === 'owner').length;

  const fetchMembers = useCallback(() => {
    if (!slug) return;
    api.get(`/organizations/${slug}/members`)
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setMembers(items);
      })
      .catch((error) => {
        const apiError = getApiError(error);
        toast.error(apiError.message || t('orgMembers.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [slug, t]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleAddMember() {
    if (!addUsername.trim()) {
      toast.error(t('orgMembers.enterUsername'));
      return;
    }
    setAddLoading(true);
    try {
      await api.post(`/organizations/${slug}/members`, {
        username: addUsername.trim(),
        role: addRole,
      });
      toast.success(t('orgMembers.addSuccess'));
      setShowAddDialog(false);
      setAddUsername('');
      setAddRole('member');
      fetchMembers();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgMembers.addFailed'));
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRoleChange(member: Member, newRole: string) {
    try {
      await api.patch(`/organizations/${slug}/members/${member.id}`, { role: newRole });
      toast.success(t('orgMembers.roleUpdated'));
      fetchMembers();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgMembers.roleUpdateFailed'));
    }
  }

  async function handleRemoveMember() {
    if (!removeMember) return;
    setRemoveLoading(true);
    try {
      await api.delete(`/organizations/${slug}/members/${removeMember.id}`);
      toast.success(t('orgMembers.memberRemoved'));
      setRemoveMember(null);
      fetchMembers();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      toast.error(apiError.message || t('orgMembers.removeFailed'));
    } finally {
      setRemoveLoading(false);
    }
  }

  function canChangeRole(member: Member): boolean {
    // Can't change own role
    if (member.user.id === currentUser?.id) return false;
    // Can't change higher or equal role
    if (ROLE_HIERARCHY[member.role] >= ROLE_HIERARCHY[currentRole]) return false;
    // Last owner can't be changed
    if (member.role === 'owner' && ownerCount <= 1) return false;
    return true;
  }

  function canRemoveMember(member: Member): boolean {
    // Can't remove self
    if (member.user.id === currentUser?.id) return false;
    // Can't remove higher or equal role
    if (ROLE_HIERARCHY[member.role] >= ROLE_HIERARCHY[currentRole]) return false;
    // Last owner can't be removed
    if (member.role === 'owner' && ownerCount <= 1) return false;
    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('orgMembers.title')}</h1>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4" />
            {t('orgMembers.addMember')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orgMembers.user')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('orgMembers.email')}</TableHead>
              <TableHead>{t('orgMembers.role')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('orgMembers.joinedAt')}</TableHead>
              <TableHead className="text-right">{t('orgMembers.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      {member.user.avatar_url && (
                        <AvatarImage src={member.user.avatar_url} alt={member.user.username} />
                      )}
                      <AvatarFallback className="text-xs">
                        {member.user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.user.username}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {member.user.email}
                </TableCell>
                <TableCell>
                  {canChangeRole(member) ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member, value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getRoleBadge(member.role)
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {format(new Date(member.joined_at), 'yyyy-MM-dd')}
                </TableCell>
                <TableCell className="text-right">
                  {canRemoveMember(member) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveMember(member)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgMembers.addMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('orgMembers.username')}</Label>
              <Input
                placeholder={t('orgMembers.usernamePlaceholder')}
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('orgMembers.role')}</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMember} disabled={addLoading}>
              {addLoading && <Loader2 className="size-4 animate-spin" />}
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orgMembers.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orgMembers.confirmRemoveDesc', { username: removeMember?.user.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removeLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeLoading && <Loader2 className="size-4 animate-spin" />}
              {t('orgMembers.confirmRemove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

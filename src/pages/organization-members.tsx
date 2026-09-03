import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Trash2, Crown, Shield, User, Loader2, Search } from 'lucide-react';
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
  DialogDescription,
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

interface MemberCandidate {
  id: number;
  username: string;
  display_name: string;
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
  const [memberQuery, setMemberQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState<MemberCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<MemberCandidate | null>(null);
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberSearchAttempted, setMemberSearchAttempted] = useState(false);
  const [memberSearchFailed, setMemberSearchFailed] = useState(false);
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

  useEffect(() => {
    const query = memberQuery.trim();
    if (!showAddDialog || !query || selectedCandidate || !slug) return;

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      setMemberSearching(true);
      setMemberSearchFailed(false);
      try {
        const { data } = await api.get<{ items: MemberCandidate[] }>(
          `/organizations/${slug}/member-candidates`,
          { params: { q: query }, signal: controller.signal },
        );
        if (!active) return;
        setMemberCandidates(data?.items ?? []);
        setMemberSearchAttempted(true);
      } catch {
        if (!active || controller.signal.aborted) return;
        setMemberCandidates([]);
        setMemberSearchAttempted(true);
        setMemberSearchFailed(true);
      } finally {
        if (active) setMemberSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [memberQuery, selectedCandidate, showAddDialog, slug]);

  function resetAddMemberForm() {
    setMemberQuery('');
    setMemberCandidates([]);
    setSelectedCandidate(null);
    setMemberSearching(false);
    setMemberSearchAttempted(false);
    setMemberSearchFailed(false);
    setAddRole('member');
  }

  function handleAddDialogChange(open: boolean) {
    setShowAddDialog(open);
    if (!open) resetAddMemberForm();
  }

  function handleMemberQueryChange(value: string) {
    setMemberQuery(value);
    setSelectedCandidate(null);
    setMemberCandidates([]);
    setMemberSearching(false);
    setMemberSearchAttempted(false);
    setMemberSearchFailed(false);
  }

  function handleCandidateSelect(candidate: MemberCandidate) {
    setSelectedCandidate(candidate);
    setMemberQuery(candidate.username);
    setMemberCandidates([]);
    setMemberSearchAttempted(false);
    setMemberSearchFailed(false);
  }

  async function handleAddMember() {
    if (!selectedCandidate) {
      toast.error(t('orgMembers.selectUser'));
      return;
    }
    setAddLoading(true);
    try {
      await api.post(`/organizations/${slug}/members`, {
        username: selectedCandidate.username,
        role: addRole,
      });
      toast.success(t('orgMembers.addSuccess'));
      setShowAddDialog(false);
      resetAddMemberForm();
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
      <Dialog open={showAddDialog} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orgMembers.addMember')}</DialogTitle>
            <DialogDescription>{t('orgMembers.addMemberDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-search">{t('orgMembers.userSearch')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="member-search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={memberCandidates.length > 0}
                  aria-controls="member-candidate-results"
                  className="pl-9 pr-9"
                  placeholder={t('orgMembers.userSearchPlaceholder')}
                  value={memberQuery}
                  onChange={(e) => handleMemberQueryChange(e.target.value)}
                />
                {memberSearching && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('orgMembers.userSearchHint')}</p>
              {memberCandidates.length > 0 && (
                <div
                  id="member-candidate-results"
                  role="listbox"
                  className="max-h-56 overflow-y-auto rounded-md border bg-popover p-1"
                >
                  {memberCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      role="option"
                      aria-selected={selectedCandidate?.id === candidate.id}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onClick={() => handleCandidateSelect(candidate)}
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {(candidate.display_name || candidate.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {candidate.display_name}
                        </span>
                        {candidate.display_name !== candidate.username && (
                          <span className="block truncate text-xs text-muted-foreground">
                            @{candidate.username}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ID: {candidate.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {memberSearchAttempted && !memberSearching && memberCandidates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {memberSearchFailed
                    ? t('orgMembers.userSearchFailed')
                    : t('orgMembers.noUserResults')}
                </p>
              )}
              {selectedCandidate && (
                <p className="text-sm text-foreground">
                  {t('orgMembers.selectedUser', {
                    name: selectedCandidate.display_name,
                    id: selectedCandidate.id,
                  })}
                </p>
              )}
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
            <Button variant="outline" onClick={() => handleAddDialogChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMember} disabled={addLoading || !selectedCandidate}>
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

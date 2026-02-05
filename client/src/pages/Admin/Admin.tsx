import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Dropdown } from '../../components/Dropdown/Dropdown';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { AdminBottomMenu } from '../../components/AdminBottomMenu/AdminBottomMenu';
import { getPaginationWindow } from '../../utils/pagination';
import { localDateTimeToMoscowISO } from '../../utils/timezone';
import './Admin.css';

interface Group {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  group_id: number;
  logo_url?: string | null;
}

interface Match {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number;
  start_time: string;
  result: 'P1' | 'P2' | null;
}

interface ArchivedMatch {
  id: number;
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  start_time: string;
  result: 'P1' | 'P2' | null;
  refund_processed: boolean;
}

interface User {
  id: number;
  telegram_id: string;
  username?: string;
  display_name?: string;
  balance: number;
}

interface Prize {
  id: number;
  position: number;
  image_url: string;
  created_at: string;
}

export function Admin() {
  const [activeTab, setActiveTab] = useState<'groups' | 'teams' | 'matches' | 'users' | 'prizes' | 'archive' | 'bonus-codes'>('groups');
  
  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{ id: number; name: string } | null>(null);
  
  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedGroupForTeam, setSelectedGroupForTeam] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [deleteTeamConfirm, setDeleteTeamConfirm] = useState<{ id: number; name: string } | null>(null);
  const [teamEdit, setTeamEdit] = useState<{ id: number; name: string; logo_url: string | null } | null>(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);
  
  // Matches
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroupForMatch, setSelectedGroupForMatch] = useState<number | null>(null);
  const [processingMatchId, setProcessingMatchId] = useState<number | null>(null);
  const [newMatch, setNewMatch] = useState({
    team1_id: 0,
    team2_id: 0,
    group_id: 0,
    start_time: '',
  });
  
  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [balanceUpdate, setBalanceUpdate] = useState<{ userId: number; amount: number; type: 'add' | 'subtract' } | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [resetDisplayNameConfirm, setResetDisplayNameConfirm] = useState<{ id: number; name: string } | null>(null);
  
  // Prizes
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizeEdit, setPrizeEdit] = useState<{ id: number; position: number; image_url: string } | null>(null);
  const [newPrizePosition, setNewPrizePosition] = useState<number>(1);
  const [prizeImagePreview, setPrizeImagePreview] = useState<string | null>(null);
  const [deletePrizeConfirm, setDeletePrizeConfirm] = useState<number | null>(null);
  const [rankingLimit, setRankingLimit] = useState<number>(15);
  const [isSavingRankingLimit, setIsSavingRankingLimit] = useState<boolean>(false);

  // Archive matches
  const [archiveMatches, setArchiveMatches] = useState<ArchivedMatch[]>([]);
  const [archivePage, setArchivePage] = useState(1);
  const [archiveTotalPages, setArchiveTotalPages] = useState(1);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [refundConfirm, setRefundConfirm] = useState<ArchivedMatch | null>(null);
  const [refundInProgress, setRefundInProgress] = useState<number | null>(null);
  const [matchResultConfirm, setMatchResultConfirm] = useState<{ matchId: number; result: 'P1' | 'P2'; team1Name: string; team2Name: string } | null>(null);
  
  // Bonus codes
  const [bonusCodes, setBonusCodes] = useState<Array<{
    id: number;
    code: string;
    value: number;
    max_uses: number | null;
    used_count: number;
    created_at: string;
  }>>([]);
  const [bonusCodesPage, setBonusCodesPage] = useState(1);
  const [bonusCodesTotalPages, setBonusCodesTotalPages] = useState(1);
  const [bonusCodesTotal, setBonusCodesTotal] = useState(0);
  const [bonusCodeGenerate, setBonusCodeGenerate] = useState({
    count: null as number | null,
    value: null as number | null,
    codeLength: null as number | null,
    maxUses: null as number | null,
    isSingleUse: true,
  });
  const [deleteBonusCodeConfirm, setDeleteBonusCodeConfirm] = useState<{ id: number; code: string } | null>(null);
  const [bonusCodeStatistics, setBonusCodeStatistics] = useState<{
    code: {
      id: number;
      code: string;
      value: number;
      max_uses: number | null;
      used_count: number;
      created_at: string;
    };
    usages: Array<{
      id: number;
      user_id: number;
      user_telegram_id: string;
      user_username?: string;
      user_display_name?: string;
      used_at: string;
    }>;
    total: number;
  } | null>(null);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  
  useEffect(() => {
    loadGroups();
    loadUsers(1);
    loadPrizes();
    loadRankingSettings();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'prizes') {
      loadPrizes();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedGroupForTeam) {
      loadTeams(selectedGroupForTeam);
    }
  }, [selectedGroupForTeam]);

  useEffect(() => {
    if (selectedGroupForMatch) {
      loadMatches(selectedGroupForMatch);
      loadTeams(selectedGroupForMatch);
    }
  }, [selectedGroupForMatch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadUsers(1, userSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [userSearchQuery]);

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchiveMatches(archivePage, archiveSearch);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'archive') {
      const handler = setTimeout(() => {
        loadArchiveMatches(1, archiveSearch);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [archiveSearch, activeTab]);

  const loadGroups = async () => {
    try {
      const data = await fetch(`${apiClient.baseUrl}/admin/groups`, {
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
      }).then(r => r.json());
      const sortedData = [...data].sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
      setGroups(sortedData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadTeams = async (groupId: number) => {
    try {
      const data = await fetch(`${apiClient.baseUrl}/admin/teams?group_id=${groupId}`, {
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
      }).then(r => r.json());
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadMatches = async (groupId: number) => {
    try {
      const data = await fetch(`${apiClient.baseUrl}/admin/matches?group_id=${groupId}`, {
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
      }).then(r => r.json());
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadUsers = async (pageNum: number = 1, search: string = userSearchQuery) => {
    try {
      setIsUsersLoading(true);
      const data = await apiClient.getAdminUsers(pageNum, 10, search);
      setUsers(data.users);
      setUsersPage(data.page);
      setUsersTotalPages(data.totalPages);
      setUsersTotal(data.total);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadArchiveMatches = async (pageNum: number = 1, searchTerm: string = archiveSearch) => {
    try {
      const data = await apiClient.getAdminArchiveMatches(pageNum, 10, searchTerm);
      setArchiveMatches(data.matches);
      setArchivePage(data.page);
      setArchiveTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error loading archive matches:', error);
    }
  };

  const handleUsersPageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= usersTotalPages) {
      loadUsers(pageNum, userSearchQuery);
    }
  };

  const handleArchivePageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= archiveTotalPages) {
      loadArchiveMatches(pageNum, archiveSearch);
    }
  };

  const handleRefundMatch = async (matchId: number) => {
    try {
      setRefundInProgress(matchId);
      await apiClient.refundMatch(matchId);
      await loadArchiveMatches(archivePage, archiveSearch);
      await loadUsers(usersPage, userSearchQuery);
    } catch (error: any) {
      console.error('Error refunding match:', error);
      alert(error?.message || 'Ошибка при возврате ставок');
    } finally {
      setRefundInProgress(null);
      setRefundConfirm(null);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    try {
      await fetch(`${apiClient.baseUrl}/admin/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      setNewGroupName('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const createTeam = async () => {
    if (!selectedGroupForTeam) return;
    if (!newTeamName.trim()) return;
    try {
      await fetch(`${apiClient.baseUrl}/admin/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({
          name: newTeamName,
          group_id: selectedGroupForTeam,
          logo_url: teamLogoPreview || null,
        }),
      });
      setNewTeamName('');
      setTeamLogoPreview(null);
      loadTeams(selectedGroupForTeam);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleTeamLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Пожалуйста, выберите PNG изображение');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await fetch(`${apiClient.baseUrl}/admin/teams/upload`, {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: formData,
      }).then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({ message: 'Ошибка при загрузке изображения' }));
          throw new Error(error.message || 'Ошибка при загрузке изображения');
        }
        return r.json();
      });

      const processedImage = result.imageData;
      setTeamLogoPreview(processedImage);
      if (teamEdit) {
        setTeamEdit({ ...teamEdit, logo_url: processedImage });
      }
    } catch (error: any) {
      console.error('Error uploading team logo:', error);
      alert(error.message || 'Ошибка при загрузке изображения');
    }
  };

  const startEditTeam = (team: Team) => {
    setTeamEdit({
      id: team.id,
      name: team.name,
      logo_url: team.logo_url || null,
    });
    setTeamLogoPreview(team.logo_url || null);
  };

  const updateTeam = async () => {
    if (!teamEdit) return;
    if (!selectedGroupForTeam) return;
    try {
      const response = await fetch(`${apiClient.baseUrl}/admin/teams/${teamEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({
          name: teamEdit.name,
          logo_url: teamEdit.logo_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка при обновлении команды' }));
        alert(error.message || 'Ошибка при обновлении команды');
        return;
      }

      setTeamEdit(null);
      setTeamLogoPreview(null);
      loadTeams(selectedGroupForTeam);
    } catch (error: any) {
      console.error('Error updating team:', error);
      alert(error.message || 'Ошибка при обновлении команды');
    }
  };

  const createMatch = async () => {
    if (!newMatch.team1_id || !newMatch.team2_id || newMatch.team1_id === 0 || newMatch.team2_id === 0) {
      alert('Необходимо выбрать обе команды');
      return;
    }
    if (newMatch.team1_id === newMatch.team2_id) {
      alert('Команды должны быть разными');
      return;
    }
    const effectiveGroupId = newMatch.group_id || selectedGroupForMatch || 0;
    if (!effectiveGroupId || effectiveGroupId === 0) {
      alert('Необходимо выбрать группу');
      return;
    }
    if (!newMatch.start_time) {
      alert('Необходимо указать дату и время начала матча');
      return;
    }

    try {
      const response = await fetch(`${apiClient.baseUrl}/admin/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({
          ...newMatch,
          group_id: effectiveGroupId,
          start_time: localDateTimeToMoscowISO(newMatch.start_time),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка при создании матча' }));
        alert(error.message || 'Ошибка при создании матча');
        return;
      }

      const savedStartTime = newMatch.start_time;
      setNewMatch({
        team1_id: 0,
        team2_id: 0,
        group_id: effectiveGroupId,
        start_time: savedStartTime,
      });
      if (selectedGroupForMatch) {
        loadMatches(selectedGroupForMatch);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Ошибка при создании матча');
    }
  };

  const handleSetMatchResultClick = (matchId: number, result: 'P1' | 'P2') => {
    // Находим матч для получения названий команд
    const match = matches.find(m => m.id === matchId);
    if (match) {
      const team1Name = getTeamName(match.team1_id);
      const team2Name = getTeamName(match.team2_id);
      setMatchResultConfirm({ matchId, result, team1Name, team2Name });
    }
  };

  const setMatchResult = async () => {
    if (!matchResultConfirm) {
      return;
    }
    
    const { matchId, result } = matchResultConfirm;
    setProcessingMatchId(matchId);
    
    try {
      const response = await fetch(`${apiClient.baseUrl}/admin/matches/${matchId}/result`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ result }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка при подведении итогов' }));
        alert(error.message || 'Ошибка при подведении итогов');
        return;
      }
      
      setMatchResultConfirm(null);
      if (selectedGroupForMatch) {
        loadMatches(selectedGroupForMatch);
      }
      loadUsers();
    } catch (error) {
      console.error('Error setting match result:', error);
      alert('Ошибка при подведении итогов матча');
    } finally {
      setProcessingMatchId(null);
    }
  };

  const deleteGroup = async (id: number) => {
    try {
      const response = await fetch(`${apiClient.baseUrl}/admin/groups/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка при удалении группы' }));
        alert(error.message || 'Ошибка при удалении группы');
        return;
      }
      setDeleteGroupConfirm(null);
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Ошибка при удалении группы');
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      const response = await fetch(`${apiClient.baseUrl}/admin/teams/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Ошибка при удалении команды' }));
        alert(error.message || 'Ошибка при удалении команды');
        return;
      }
      setDeleteTeamConfirm(null);
      if (selectedGroupForTeam) {
        loadTeams(selectedGroupForTeam);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Ошибка при удалении команды');
    }
  };

  const updateUserBalance = async (userId: number, amount: number, type: 'add' | 'subtract') => {
    try {
      const finalAmount = type === 'add' ? amount : -amount;
      await fetch(`${apiClient.baseUrl}/admin/users/${userId}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ amount: finalAmount }),
      });
      setBalanceUpdate(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const resetUserDisplayName = async (userId: number) => {
    try {
      await apiClient.resetUserDisplayName(userId);
      setResetDisplayNameConfirm(null);
      loadUsers(usersPage, userSearchQuery);
    } catch (error: any) {
      console.error('Error resetting display name:', error);
      alert(error?.message || 'Ошибка при сбросе никнейма');
    }
  };

  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : `Команда #${teamId}`;
  };

  const loadPrizes = async () => {
    try {
      const data = await apiClient.getPrizes();
      setPrizes(data);
    } catch (error) {
      console.error('Error loading prizes:', error);
    }
  };

  const loadRankingSettings = async () => {
    try {
      const data = await apiClient.getRankingSettings();
      if (typeof data.rankingLimit === 'number' && data.rankingLimit > 0) {
        setRankingLimit(data.rankingLimit);
      }
    } catch (error) {
      console.error('Error loading ranking settings:', error);
    }
  };

  const saveRankingSettings = async () => {
    if (!rankingLimit || !Number.isFinite(rankingLimit) || isNaN(rankingLimit) || rankingLimit <= 0) {
      alert('Лимит мест должен быть больше 0');
      return;
    }
    try {
      setIsSavingRankingLimit(true);
      const result = await apiClient.updateRankingSettings(rankingLimit);
      setRankingLimit(result.rankingLimit);
    } catch (error: any) {
      console.error('Error saving ranking settings:', error);
      alert(error.message || 'Ошибка при сохранении лимита рейтинга');
    } finally {
      setIsSavingRankingLimit(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Пожалуйста, выберите PNG изображение');
      return;
    }

    try {
      const result = await apiClient.uploadPrizeImage(file);
      const processedImage = result.imageData;

      setPrizeImagePreview(processedImage);
      if (prizeEdit) {
        setPrizeEdit({ ...prizeEdit, image_url: processedImage });
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Ошибка при загрузке изображения');
    }
  };

  const createPrize = async () => {
    if (!prizeImagePreview) {
      alert('Пожалуйста, загрузите изображение');
      return;
    }
    if (newPrizePosition <= 0) {
      alert('Позиция должна быть больше 0');
      return;
    }
    try {
      await apiClient.createPrize({
        position: newPrizePosition,
        image_url: prizeImagePreview,
      });
      setNewPrizePosition(1);
      setPrizeImagePreview(null);
      loadPrizes();
    } catch (error: any) {
      console.error('Error creating prize:', error);
      alert(error.message || 'Ошибка при создании приза');
    }
  };

  const updatePrize = async () => {
    if (!prizeEdit) return;
    if (!prizeEdit.image_url) {
      alert('Пожалуйста, загрузите изображение');
      return;
    }
    try {
      await apiClient.updatePrize(prizeEdit.id, {
        position: prizeEdit.position,
        image_url: prizeEdit.image_url,
      });
      setPrizeEdit(null);
      setPrizeImagePreview(null);
      loadPrizes();
    } catch (error: any) {
      console.error('Error updating prize:', error);
      alert(error.message || 'Ошибка при обновлении приза');
    }
  };

  const deletePrize = async (id: number) => {
    try {
      await apiClient.deletePrize(id);
      setDeletePrizeConfirm(null);
      loadPrizes();
    } catch (error) {
      console.error('Error deleting prize:', error);
      alert('Ошибка при удалении приза');
    }
  };

  const startEditPrize = (prize: Prize) => {
    setPrizeEdit({
      id: prize.id,
      position: prize.position,
      image_url: prize.image_url,
    });
    setPrizeImagePreview(prize.image_url);
  };

  // Bonus codes
  useEffect(() => {
    if (activeTab === 'bonus-codes') {
      loadBonusCodes(bonusCodesPage);
    }
  }, [activeTab]);

  const loadBonusCodes = async (pageNum: number = 1) => {
    try {
      const data = await apiClient.getBonusCodes(pageNum, 20);
      setBonusCodes(data.codes);
      setBonusCodesPage(data.page);
      setBonusCodesTotalPages(data.totalPages);
      setBonusCodesTotal(data.total);
    } catch (error) {
      console.error('Error loading bonus codes:', error);
    }
  };

  const handleBonusCodesPageChange = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= bonusCodesTotalPages) {
      loadBonusCodes(pageNum);
    }
  };

  const generateBonusCodes = async () => {
    if (!bonusCodeGenerate.count || bonusCodeGenerate.count <= 0 || bonusCodeGenerate.count > 1000) {
      alert('Количество кодов должно быть от 1 до 1000');
      return;
    }
    if (!bonusCodeGenerate.value || bonusCodeGenerate.value <= 0) {
      alert('Номинал должен быть больше 0');
      return;
    }
    if (!bonusCodeGenerate.codeLength || bonusCodeGenerate.codeLength < 4 || bonusCodeGenerate.codeLength > 32) {
      alert('Длина кода должна быть от 4 до 32 символов');
      return;
    }
    if (!bonusCodeGenerate.isSingleUse && (!bonusCodeGenerate.maxUses || bonusCodeGenerate.maxUses <= 0)) {
      alert('Максимальное количество использований должно быть больше 0');
      return;
    }

    try {
      setIsGeneratingCodes(true);
      await apiClient.generateBonusCodes({
        count: bonusCodeGenerate.count,
        value: bonusCodeGenerate.value,
        codeLength: bonusCodeGenerate.codeLength,
        maxUses: bonusCodeGenerate.isSingleUse ? null : bonusCodeGenerate.maxUses,
      });
      setBonusCodeGenerate({
        count: null,
        value: null,
        codeLength: null,
        maxUses: null,
        isSingleUse: true,
      });
      await loadBonusCodes(bonusCodesPage);
    } catch (error: any) {
      console.error('Error generating bonus codes:', error);
      alert(error.message || 'Ошибка при генерации бонус-кодов');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const deleteBonusCode = async (id: number) => {
    try {
      await apiClient.deleteBonusCode(id);
      setDeleteBonusCodeConfirm(null);
      await loadBonusCodes(bonusCodesPage);
    } catch (error: any) {
      console.error('Error deleting bonus code:', error);
      alert(error.message || 'Ошибка при удалении бонус-кода');
    }
  };

  const loadBonusCodeStatistics = async (codeId: number) => {
    try {
      const data = await apiClient.getBonusCodeStatistics(codeId);
      setBonusCodeStatistics(data);
    } catch (error: any) {
      console.error('Error loading bonus code statistics:', error);
      alert(error.message || 'Ошибка при загрузке статистики');
    }
  };

  return (
    <div className="admin-screen">
      <div className="admin-content">
        {activeTab === 'groups' && (
            <div className="admin-section">
            <h3>Группы</h3>
            <div className="admin-form">
              <input
                type="text"
                placeholder="Название группы"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button onClick={createGroup} disabled={!newGroupName.trim()}>
                Создать
              </button>
            </div>
            <div className="admin-list">
              {groups.map((group) => (
                <div key={group.id} className="admin-item">
                  <span>{group.name}</span>
                  <div className="admin-actions">
                    <button
                      className="admin-action-delete"
                      onClick={() => setDeleteGroupConfirm({ id: group.id, name: group.name })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <ConfirmModal
              isOpen={!!deleteGroupConfirm}
              title="Удаление группы"
              message={`Вы уверены, что хотите удалить группу "${deleteGroupConfirm?.name}"? Это действие нельзя отменить.`}
              confirmText="Удалить"
              cancelText="Отмена"
              type="danger"
              onConfirm={() => deleteGroupConfirm && deleteGroup(deleteGroupConfirm.id)}
              onCancel={() => setDeleteGroupConfirm(null)}
            />
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="admin-section">
            <h3>Команды</h3>
            {!teamEdit && (
              <div className="admin-form">
                <Dropdown
                  options={[
                    { value: '', label: 'Выберите группу' },
                    ...groups
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                      .map((group) => ({ value: group.id, label: group.name })),
                  ]}
                  value={selectedGroupForTeam || ''}
                  onChange={(value) => setSelectedGroupForTeam(value ? Number(value) : null)}
                  placeholder="Выберите группу"
                />
                <input
                  type="text"
                  placeholder="Название команды"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleTeamLogoUpload}
                    style={{ display: 'none' }}
                    id="team-logo-create-upload"
                  />
                  <label
                    htmlFor="team-logo-create-upload"
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {teamLogoPreview ? 'Логотип загружен (нажмите чтобы заменить)' : 'Загрузить PNG логотип'}
                  </label>
                  {teamLogoPreview && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img
                        src={teamLogoPreview}
                        alt="Team logo preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}
                </div>
                <button onClick={createTeam} disabled={!selectedGroupForTeam || !newTeamName.trim()}>
                  Создать
                </button>
              </div>
            )}

            {teamEdit && (
              <div className="admin-form">
                <input
                  type="text"
                  placeholder="Название команды"
                  value={teamEdit.name}
                  onChange={(e) => setTeamEdit({ ...teamEdit, name: e.target.value })}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleTeamLogoUpload}
                    style={{ display: 'none' }}
                    id="team-logo-edit-upload"
                  />
                  <label
                    htmlFor="team-logo-edit-upload"
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {teamLogoPreview ? 'Логотип загружен (нажмите чтобы заменить)' : 'Загрузить PNG логотип'}
                  </label>
                  {teamLogoPreview && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img
                        src={teamLogoPreview}
                        alt="Team logo preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={updateTeam} style={{ flex: 1 }}>
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setTeamEdit(null);
                      setTeamLogoPreview(null);
                    }}
                    style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    Отмена
                  </button>
                </div>

                {teamEdit.logo_url && (
                  <button
                    onClick={() => {
                      setTeamEdit({ ...teamEdit, logo_url: null });
                      setTeamLogoPreview(null);
                    }}
                    style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                  >
                    Убрать логотип
                  </button>
                )}
              </div>
            )}
            <div className="admin-list">
              {teams.map((team) => (
                <div key={team.id} className="admin-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {team.logo_url && (
                      <img
                        src={team.logo_url}
                        alt={`${team.name} logo`}
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'contain',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(0, 0, 0, 0.15)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </span>
                  </div>
                  <div className="admin-actions">
                    <button onClick={() => startEditTeam(team)}>Изменить</button>
                    <button
                      className="admin-action-delete"
                      onClick={() => setDeleteTeamConfirm({ id: team.id, name: team.name })}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <ConfirmModal
              isOpen={!!deleteTeamConfirm}
              title="Удаление команды"
              message={`Вы уверены, что хотите удалить команду "${deleteTeamConfirm?.name}"? Это действие нельзя отменить.`}
              confirmText="Удалить"
              cancelText="Отмена"
              type="danger"
              onConfirm={() => deleteTeamConfirm && deleteTeam(deleteTeamConfirm.id)}
              onCancel={() => setDeleteTeamConfirm(null)}
            />
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="admin-section">
            <h3>Матчи</h3>
            <div className="admin-form">
              <Dropdown
                options={[
                  { value: '', label: 'Выберите группу' },
                  ...groups
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((group) => ({ value: group.id, label: group.name })),
                ]}
                value={selectedGroupForMatch || ''}
                onChange={(value) => {
                  const groupId = value ? Number(value) : null;
                  setSelectedGroupForMatch(groupId);
                  setNewMatch({ ...newMatch, group_id: groupId || 0 });
                }}
                placeholder="Выберите группу"
              />
              {selectedGroupForMatch && (
                <>
                  <Dropdown
                    options={[
                      { value: 0, label: 'Команда 1' },
                      ...teams
                        .filter(t => t.group_id === selectedGroupForMatch)
                        .map((team) => ({ value: team.id, label: team.name })),
                    ]}
                    value={newMatch.team1_id}
                    onChange={(value) => setNewMatch({ ...newMatch, team1_id: Number(value) })}
                    placeholder="Команда 1"
                  />
                  <Dropdown
                    options={[
                      { value: 0, label: 'Команда 2' },
                      ...teams
                        .filter(t => t.group_id === selectedGroupForMatch)
                        .map((team) => ({ value: team.id, label: team.name })),
                    ]}
                    value={newMatch.team2_id}
                    onChange={(value) => setNewMatch({ ...newMatch, team2_id: Number(value) })}
                    placeholder="Команда 2"
                  />
                  <input
                    type="datetime-local"
                    value={newMatch.start_time}
                    onChange={(e) => setNewMatch({ ...newMatch, start_time: e.target.value })}
                  />
                  <button
                    onClick={createMatch}
                    disabled={
                      !(
                        selectedGroupForMatch &&
                        newMatch.team1_id &&
                        newMatch.team2_id &&
                        newMatch.start_time
                      )
                    }
                  >
                    Создать
                  </button>
                </>
              )}
            </div>
            <div className="admin-list">
              {matches.map((match) => (
                <div key={match.id} className="admin-item">
                  <div>
                    <div>Матч #{match.id}</div>
                    <div style={{ fontSize: '12px', color: 'var(--white-icon)', marginTop: '4px' }}>
                      {getTeamName(match.team1_id)} vs {getTeamName(match.team2_id)}
                    </div>
                  </div>
                  {!match.result && (
                    <div className="admin-actions">
                      {processingMatchId === match.id ? (
                        <button disabled>Завершение...</button>
                      ) : (
                        <>
                          <button onClick={() => handleSetMatchResultClick(match.id, 'P1')}>П1</button>
                          <button onClick={() => handleSetMatchResultClick(match.id, 'P2')}>П2</button>
                        </>
                      )}
                    </div>
                  )}
                  {match.result && <span>Результат: {match.result}</span>}
                </div>
              ))}
            </div>
            {matchResultConfirm && (
              <ConfirmModal
                isOpen={true}
                title="Подведение итогов матча"
                message={`Победитель: ${matchResultConfirm.result === 'P1' ? matchResultConfirm.team1Name : matchResultConfirm.team2Name} (${matchResultConfirm.result})`}
                confirmText="Подтвердить"
                cancelText="Отмена"
                type="info"
                onConfirm={setMatchResult}
                onCancel={() => setMatchResultConfirm(null)}
              />
            )}
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="admin-section">
            <h3>Архив матчей</h3>
            <div className="admin-search-container">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Поиск по командам..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
              />
            </div>
            <div className="admin-list">
              {archiveMatches.length === 0 ? (
                <div className="admin-empty">Завершенные матчи не найдены</div>
              ) : (
                archiveMatches.map((match) => {
                  const winner =
                    match.result === 'P1'
                      ? match.team1.name
                      : match.result === 'P2'
                      ? match.team2.name
                      : '—';
                  return (
                    <div key={match.id} className="admin-item">
                      <div style={{ flex: 1 }}>
                        <div>Матч #{match.id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--white-icon)', marginTop: '4px' }}>
                          {match.team1.name} vs {match.team2.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--white-icon)', marginTop: '6px' }}>
                          Результат: {winner}
                        </div>
                        {match.refund_processed && (
                          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>
                            Возврат выполнен
                          </div>
                        )}
                      </div>
                      <div className="admin-actions">
                        <button
                          onClick={() => setRefundConfirm(match)}
                          disabled={match.refund_processed || refundInProgress === match.id}
                        >
                          {match.refund_processed
                            ? 'Возврат выполнен'
                            : refundInProgress === match.id
                            ? 'Возврат...'
                            : 'Вернуть ставки'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {archiveTotalPages > 1 && (
              <div className="admin-pagination">
                {getPaginationWindow(archivePage, archiveTotalPages, 5).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-page ${archivePage === pageNum ? 'active' : ''}`}
                    onClick={() => handleArchivePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
            {refundConfirm && (
              <ConfirmModal
                isOpen={true}
                title="Вернуть ставки?"
                message="Все участники получат обратно свои поставленные баллы. Действие нельзя отменить."
                confirmText="Вернуть"
                cancelText="Отмена"
                type="danger"
                onConfirm={() => refundConfirm && handleRefundMatch(refundConfirm.id)}
                onCancel={() => setRefundConfirm(null)}
              />
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-section">
            <h3>Пользователи</h3>
            <div className="admin-search-container">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Поиск по отображаемому имени, username или Telegram ID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              <div className="admin-users-count">
                Количество пользователей: <span>{usersTotal}</span>
              </div>
            </div>
            <div className="admin-list">
              {isUsersLoading ? (
                <div className="admin-loading">Загрузка пользователей...</div>
              ) : users.length === 0 ? (
                <div className="admin-empty">Нет пользователей</div>
              ) : (
                users.map((user) => {
                  const telegramIdentifier = user.username || user.telegram_id;
                  const userNameDisplay = user.display_name
                    ? `${user.display_name} (${telegramIdentifier})`
                    : telegramIdentifier;
                  return (
                    <div key={user.id} className="admin-item">
                      <div>
                        <div>{userNameDisplay}</div>
                        <div style={{ fontSize: '14px', color: 'var(--white-icon)', marginTop: '4px' }}>
                          <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{user.balance.toFixed(2)}</span> баллов
                        </div>
                      </div>
                      <div className="admin-actions">
                        <button
                          className="admin-balance-button"
                          onClick={() => setBalanceUpdate({ userId: user.id, amount: 0, type: 'add' })}
                        >
                          Изменить баланс
                        </button>
                        {user.display_name && (
                          <button
                            className="admin-action-delete"
                            onClick={() => setResetDisplayNameConfirm({ id: user.id, name: user.display_name || '' })}
                          >
                            Сбросить никнейм
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {usersTotalPages > 1 && (
              <div className="admin-pagination">
                {getPaginationWindow(usersPage, usersTotalPages, 5).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-page ${usersPage === pageNum ? 'active' : ''}`}
                    onClick={() => handleUsersPageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
            {balanceUpdate && (
              <div className="admin-modal">
                <div className="admin-modal-content">
                  <h4>Изменение баланса</h4>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        className={`balance-type-button ${balanceUpdate.type === 'add' ? 'active' : ''}`}
                        onClick={() => setBalanceUpdate({ ...balanceUpdate, type: 'add' })}
                      >
                        Выдать
                      </button>
                      <button
                        className={`balance-type-button ${balanceUpdate.type === 'subtract' ? 'active' : ''}`}
                        onClick={() => setBalanceUpdate({ ...balanceUpdate, type: 'subtract' })}
                      >
                        Списать
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="Сумма"
                      value={balanceUpdate.amount || ''}
                      onChange={(e) => setBalanceUpdate({ ...balanceUpdate, amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="admin-modal-actions">
                    <button
                      onClick={() => updateUserBalance(balanceUpdate.userId, balanceUpdate.amount, balanceUpdate.type)}
                      disabled={!balanceUpdate.amount || balanceUpdate.amount <= 0}
                    >
                      Сохранить
                    </button>
                    <button onClick={() => setBalanceUpdate(null)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}
            <ConfirmModal
              isOpen={!!resetDisplayNameConfirm}
              title="Сброс никнейма"
              message={`Вы уверены, что хотите сбросить никнейм "${resetDisplayNameConfirm?.name}"? Пользователь сможет установить новый никнейм самостоятельно.`}
              confirmText="Сбросить"
              cancelText="Отмена"
              type="danger"
              onConfirm={() => resetDisplayNameConfirm && resetUserDisplayName(resetDisplayNameConfirm.id)}
              onCancel={() => setResetDisplayNameConfirm(null)}
            />
          </div>
        )}

        {activeTab === 'prizes' && (
          <div className="admin-section">
            <h3>Призы/Рейтинг</h3>
            
            <div className="admin-form" style={{ marginBottom: '20px' }}>
              <div style={{ width: '100%' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: 'var(--white-icon)',
                  }}
                >
                  Количество мест, отображаемых в рейтинге
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={rankingLimit || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setRankingLimit(15);
                      } else {
                        const numValue = Number(value);
                        if (!isNaN(numValue) && Number.isFinite(numValue) && numValue > 0) {
                          setRankingLimit(numValue);
                        }
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button onClick={saveRankingSettings} disabled={isSavingRankingLimit}>
                    {isSavingRankingLimit ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--white-icon)',
                  }}
                >
                  Это количество мест будет показано пользователям во вкладке «Рейтинг».
                </div>
              </div>
            </div>

            {!prizeEdit && (
              <div className="admin-form">
                <input
                  type="number"
                  placeholder="Позиция (место в рейтинге)"
                  value={newPrizePosition || ''}
                  onChange={(e) => setNewPrizePosition(Number(e.target.value) || 1)}
                  min="1"
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="prize-image-upload"
                  />
                  <label
                    htmlFor="prize-image-upload"
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {prizeImagePreview ? 'Изображение загружено' : 'Загрузить PNG изображение'}
                  </label>
                  {prizeImagePreview && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img
                        src={prizeImagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      />
                    </div>
                  )}
                </div>
                <button onClick={createPrize} disabled={!prizeImagePreview}>
                  Добавить место
                </button>
              </div>
            )}

            {prizeEdit && (
              <div className="admin-form">
                <input
                  type="number"
                  placeholder="Позиция (место в рейтинге)"
                  value={prizeEdit.position || ''}
                  onChange={(e) => setPrizeEdit({ ...prizeEdit, position: Number(e.target.value) || 1 })}
                  min="1"
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="prize-image-edit-upload"
                  />
                  <label
                    htmlFor="prize-image-edit-upload"
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: 'var(--white)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    {prizeImagePreview ? 'Изображение загружено' : 'Загрузить PNG изображение'}
                  </label>
                  {prizeImagePreview && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img
                        src={prizeImagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={updatePrize} style={{ flex: 1 }}>
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setPrizeEdit(null);
                      setPrizeImagePreview(null);
                    }}
                    style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <div className="admin-list">
              {prizes
                .sort((a, b) => a.position - b.position)
                .map((prize) => (
                  <div key={prize.id} className="admin-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--white)' }}>
                          Место #{prize.position}
                        </div>
                      </div>
                      {prize.image_url && (
                        <img
                          src={prize.image_url}
                          alt={`Prize ${prize.position}`}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        />
                      )}
                    </div>
                    <div className="admin-actions">
                      <button onClick={() => startEditPrize(prize)}>Изменить</button>
                      <button
                        className="admin-action-delete"
                        onClick={() => setDeletePrizeConfirm(prize.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              {prizes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--white-icon)' }}>
                  Нет добавленных призов.<br />
                  Количество мест в рейтинге сейчас: {rankingLimit}.
                </div>
              )}
            </div>

            {deletePrizeConfirm && (
              <ConfirmModal
                isOpen={true}
                title="Удалить приз?"
                message="Вы уверены, что хотите удалить этот приз?"
                onConfirm={() => deletePrize(deletePrizeConfirm)}
                onCancel={() => setDeletePrizeConfirm(null)}
              />
            )}
          </div>
        )}

        {activeTab === 'bonus-codes' && (
          <div className="admin-section">
            <h3>Бонус-коды</h3>
            
            <div className="admin-form" style={{ marginBottom: '20px' }}>
              <input
                type="number"
                placeholder="Количество кодов (от 1 до 1000)"
                min="1"
                max="1000"
                value={bonusCodeGenerate.count || ''}
                onChange={(e) => setBonusCodeGenerate({ ...bonusCodeGenerate, count: e.target.value ? Number(e.target.value) : null })}
              />
              <input
                type="number"
                placeholder="Номинал в баллах (например: 100)"
                min="0.01"
                step="0.01"
                value={bonusCodeGenerate.value || ''}
                onChange={(e) => setBonusCodeGenerate({ ...bonusCodeGenerate, value: e.target.value ? Number(e.target.value) : null })}
              />
              <input
                type="number"
                placeholder="Длина кода (от 4 до 32 символов)"
                min="4"
                max="32"
                value={bonusCodeGenerate.codeLength || ''}
                onChange={(e) => setBonusCodeGenerate({ ...bonusCodeGenerate, codeLength: e.target.value ? Number(e.target.value) : null })}
              />
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '12px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
              onClick={() => setBonusCodeGenerate({ ...bonusCodeGenerate, isSingleUse: !bonusCodeGenerate.isSingleUse, maxUses: !bonusCodeGenerate.isSingleUse ? null : 1 })}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: '2px solid',
                  borderColor: bonusCodeGenerate.isSingleUse ? 'var(--sec-light)' : 'rgba(255, 255, 255, 0.3)',
                  background: bonusCodeGenerate.isSingleUse ? 'var(--sec-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}>
                  {bonusCodeGenerate.isSingleUse && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <label 
                  htmlFor="bonus-code-single-use" 
                  style={{ 
                    color: 'var(--white-icon)', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    flex: 1,
                  }}
                >
                  Разовый код (удаляется после использования)
                </label>
              </div>
              {!bonusCodeGenerate.isSingleUse && (
                <input
                  type="number"
                  placeholder="Максимальное количество использований"
                  min="1"
                  value={bonusCodeGenerate.maxUses || ''}
                  onChange={(e) => setBonusCodeGenerate({ ...bonusCodeGenerate, maxUses: e.target.value ? Number(e.target.value) : null })}
                />
              )}
              <button 
                onClick={generateBonusCodes} 
                disabled={
                  isGeneratingCodes || 
                  !bonusCodeGenerate.count || 
                  !bonusCodeGenerate.value || 
                  !bonusCodeGenerate.codeLength ||
                  (!bonusCodeGenerate.isSingleUse && !bonusCodeGenerate.maxUses)
                }
              >
                {isGeneratingCodes ? 'Генерация...' : 'Сгенерировать'}
              </button>
            </div>

            <div style={{ marginBottom: '16px', color: 'var(--white-icon)', fontSize: '14px' }}>
              Всего кодов: <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{bonusCodesTotal}</span>
            </div>

            <div className="admin-list">
              {bonusCodes.length === 0 ? (
                <div className="admin-empty">Нет созданных бонус-кодов</div>
              ) : (
                bonusCodes.map((code) => (
                  <div key={code.id} className="admin-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--white)', marginBottom: '4px' }}>
                        {code.code}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--white-icon)', marginTop: '4px' }}>
                        <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{code.value.toFixed(2)}</span> баллов
                      </div>
                      {code.max_uses === null ? (
                        <div style={{ fontSize: '11px', color: 'var(--white-icon)', marginTop: '6px', opacity: 0.7 }}>
                          Разовый код
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--white-icon)', marginTop: '6px', opacity: 0.7 }}>
                          Использован: {code.used_count} / {code.max_uses}
                        </div>
                      )}
                    </div>
                    <div className="admin-actions">
                      <button onClick={() => loadBonusCodeStatistics(code.id)}>
                        Статистика
                      </button>
                      <button
                        className="admin-action-delete"
                        onClick={() => setDeleteBonusCodeConfirm({ id: code.id, code: code.code })}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {bonusCodesTotalPages > 1 && (
              <div className="admin-pagination">
                {getPaginationWindow(bonusCodesPage, bonusCodesTotalPages, 5).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-page ${bonusCodesPage === pageNum ? 'active' : ''}`}
                    onClick={() => handleBonusCodesPageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}

            {deleteBonusCodeConfirm && (
              <ConfirmModal
                isOpen={true}
                title="Удаление бонус-кода"
                message={`Вы уверены, что хотите удалить бонус-код "${deleteBonusCodeConfirm.code}"? Это действие нельзя отменить.`}
                confirmText="Удалить"
                cancelText="Отмена"
                type="danger"
                onConfirm={() => deleteBonusCode(deleteBonusCodeConfirm.id)}
                onCancel={() => setDeleteBonusCodeConfirm(null)}
              />
            )}

            {bonusCodeStatistics && (
              <div className="admin-modal">
                <div className="admin-modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4>Статистика использования: {bonusCodeStatistics.code.code}</h4>
                    <button
                      onClick={() => setBonusCodeStatistics(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--white-icon)', cursor: 'pointer', fontSize: '24px' }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ marginBottom: '16px', color: 'var(--white-icon)' }}>
                    <div>Номинал: <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{bonusCodeStatistics.code.value.toFixed(2)}</span> баллов</div>
                    <div>Всего использований: <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{bonusCodeStatistics.total}</span></div>
                    {bonusCodeStatistics.code.max_uses !== null && (
                      <div>Лимит: <span style={{ color: 'var(--sec-light)', fontWeight: 600 }}>{bonusCodeStatistics.code.max_uses}</span></div>
                    )}
                  </div>
                  {bonusCodeStatistics.usages.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--white-icon)', fontSize: '12px' }}>Пользователь</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--white-icon)', fontSize: '12px' }}>Дата использования</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bonusCodeStatistics.usages.map((usage) => (
                            <tr key={usage.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td style={{ padding: '12px', color: 'var(--white)' }}>
                                {usage.user_display_name || usage.user_username || usage.user_telegram_id}
                              </td>
                              <td style={{ padding: '12px', color: 'var(--white-icon)', fontSize: '12px' }}>
                                {new Date(usage.used_at).toLocaleString('ru-RU')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--white-icon)' }}>
                      Код еще не использовался
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <AdminBottomMenu activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}


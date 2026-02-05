import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { GroupCard } from '../../components/GroupCard/GroupCard';
import { isMatchStarted } from '../../utils/timezone';
import { getSocket } from '../../utils/socket';
import './Main.css';

interface Group {
  id: number;
  name: string;
  created_at: string;
  teams?: Array<{ id: number; name: string; is_active: boolean }>;
}

interface Match {
  id: number;
  start_time: string;
  result: 'P1' | 'P2' | null;
}

export function Main() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchesByGroup, setMatchesByGroup] = useState<Record<number, Match[]>>({});

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    // Загружаем матчи для всех групп
    groups.forEach((group: Group) => {
      loadMatchesForGroup(group.id);
    });
  }, [groups]);

  useEffect(() => {
    const socket = getSocket();
    const handleMatchesUpdated = (payload: { groupId: number }) => {
      loadMatchesForGroup(payload.groupId);
    };
    const handleMatchStarted = () => {
      // Перезагружаем матчи для всех групп при старте матча
      groups.forEach((group: Group) => {
        loadMatchesForGroup(group.id);
      });
    };

    socket.on('matchesUpdated', handleMatchesUpdated);
    socket.on('matchStarted', handleMatchStarted);

    return () => {
      socket.off('matchesUpdated', handleMatchesUpdated);
      socket.off('matchStarted', handleMatchStarted);
    };
  }, [groups]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getGroups();
      const sortedData = [...data].sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
      setGroups(sortedData);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки групп');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesForGroup = async (groupId: number) => {
    try {
      const matches = await apiClient.getMatches(groupId);
      setMatchesByGroup((prev: Record<number, Match[]>) => ({
        ...prev,
        [groupId]: matches,
      }));
    } catch (err) {
      console.error(`Error loading matches for group ${groupId}:`, err);
    }
  };

  const getGroupMatchStatus = (groupId: number) => {
    const matches = matchesByGroup[groupId] || [];
    if (matches.length === 0) {
      return { hasActiveMatches: false, hasOpenMatches: false };
    }

    // Учитываем только незавершенные матчи (result === null)
    const pendingMatches = matches.filter((match: Match) => match.result === null);
    if (pendingMatches.length === 0) {
      return { hasActiveMatches: false, hasOpenMatches: false };
    }

    // Зеленый индикатор: хотя бы один матч еще принимает ставки (не начался)
    const hasOpenMatches = pendingMatches.some(
      (match: Match) => !isMatchStarted(match.start_time),
    );

    // Красный индикатор: ставок уже нигде не принять и все незавершенные матчи уже идут
    const allPendingStarted = pendingMatches.every(
      (match: Match) => isMatchStarted(match.start_time),
    );
    const hasActiveMatches = !hasOpenMatches && allPendingStarted;

    return { hasActiveMatches, hasOpenMatches };
  };

  const handleGroupClick = (groupId: number) => {
    navigate(`/group/${groupId}`);
  };

  return (
    <div className="main-screen">
      <div className="main-content">
        <h3 className="main-section-title">Ставки</h3>
        {loading ? (
          <div className="main-loading">Загрузка...</div>
        ) : error ? (
          <div className="main-error">{error}</div>
        ) : groups.length === 0 ? (
          <div className="main-empty">Нет групп</div>
        ) : (
          <div className="main-groups">
            {groups.map((group: Group, index: number) => {
              const { hasActiveMatches, hasOpenMatches } = getGroupMatchStatus(group.id);
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={index + 1}
                  onClick={() => handleGroupClick(group.id)}
                  hasActiveMatches={hasActiveMatches}
                  hasOpenMatches={hasOpenMatches}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


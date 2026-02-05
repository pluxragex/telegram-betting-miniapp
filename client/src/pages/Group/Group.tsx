import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { MatchCard } from '../../components/MatchCard/MatchCard';
import {
  getSocket,
  joinGroupRoom,
  leaveGroupRoom,
  joinMatchRoom,
  leaveMatchRoom,
} from '../../utils/socket';
import './Group.css';

interface Match {
  id: number;
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  start_time: string;
  result: 'P1' | 'P2' | null;
  coefficients: { p1: number; p2: number };
}

export function Group() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const id = parseInt(groupId);
    if (!Number.isFinite(id)) return;
    joinGroupRoom(id);
    return () => {
      leaveGroupRoom(id);
    };
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadMatches(parseInt(groupId));
    }
  }, [groupId]);

  useEffect(() => {
    const matchIds = matches.map((m) => m.id).filter((id) => Number.isFinite(id) && id > 0);
    matchIds.forEach((id) => joinMatchRoom(id));
    return () => {
      matchIds.forEach((id) => leaveMatchRoom(id));
    };
  }, [matches]);

  useEffect(() => {
    const socket = getSocket();
    const handleMatchesUpdated = (payload: { groupId: number }) => {
      if (groupId && payload.groupId === parseInt(groupId)) {
        loadMatches(parseInt(groupId), { background: true });
      }
    };
    const handleOddsUpdated = (_payload: { matchId: number }) => {
      if (!groupId) return;
      loadMatches(parseInt(groupId), { background: true });
    };
    const handleMatchStarted = (_payload: { matchId: number }) => {
      if (!groupId) return;
      loadMatches(parseInt(groupId), { background: true });
    };

    socket.on('matchesUpdated', handleMatchesUpdated);
    socket.on('oddsUpdated', handleOddsUpdated);
    socket.on('matchStarted', handleMatchStarted);

    return () => {
      socket.off('matchesUpdated', handleMatchesUpdated);
      socket.off('oddsUpdated', handleOddsUpdated);
      socket.off('matchStarted', handleMatchStarted);
    };
  }, [groupId]);

  const loadMatches = async (id: number, options?: { background?: boolean }) => {
    try {
      if (!options?.background) {
        setLoading(true);
      }
      const data = await apiClient.getMatches(id);
      setMatches(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки матчей');
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  };

  const handleBetPlaced = () => {
    if (groupId) {
      loadMatches(parseInt(groupId), { background: true });
    }
  };

  if (loading) {
    return (
      <div className="group-screen">
        <div className="group-loading">Загрузка матчей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-screen">
        <div className="group-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="group-screen">
      <div className="group-content">
        <button
          className="button button-secondary group-back-button"
          onClick={() => navigate('/')}
        >
          ← Назад
        </button>
        {matches.length === 0 ? (
          <div className="group-empty">Нет доступных матчей</div>
        ) : (
          <div className="group-matches">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onBetPlaced={handleBetPlaced}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import { HistoryCard } from '../../components/HistoryCard/HistoryCard';
import { getSocket } from '../../utils/socket';
import { getPaginationWindow } from '../../utils/pagination';
import './Profile.css';

interface Bet {
  id: number;
  match: {
    id: number;
    team1: string;
    team2: string;
  };
  side: 'P1' | 'P2';
  amount: number;
  coefficient: number;
  status: 'pending' | 'win' | 'lose' | 'refunded';
  created_at: string;
}

export function Profile() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<Bet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);

  const userRef = useRef<any>(null);
  const pageRef = useRef<number>(1);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    loadUser();
    loadHistory(1);
    checkDailyBonus();
  }, []);

  useEffect(() => {
    if (user) {
      checkDailyBonus();
    }
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    const handleUserBetsUpdated = (payload: { userId: number }) => {
      if (userRef.current && payload.userId === userRef.current.id) {
        loadHistory(pageRef.current, { background: true });
      }
    };

    socket.on('userBetsUpdated', handleUserBetsUpdated);

    return () => {
      socket.off('userBetsUpdated', handleUserBetsUpdated);
    };
  }, []);

  const loadUser = async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки профиля');
    }
  };

  const checkDailyBonus = async () => {
    try {
      const data = await apiClient.checkDailyBonus();
      // Принудительно обновляем состояние
      setCanClaimBonus(data.canClaim);
      console.log('Daily bonus check:', data.canClaim);
    } catch (err: any) {
      console.error('Error checking daily bonus:', err);
      // В случае ошибки устанавливаем false, чтобы не показывать кнопку
      setCanClaimBonus(false);
    }
  };

  const handleClaimDailyBonus = async () => {
    if (isClaimingBonus || !canClaimBonus) {
      return;
    }

    setIsClaimingBonus(true);
    try {
      await apiClient.claimDailyBonus();
      setCanClaimBonus(false);
      await loadUser();
    } catch (err: any) {
      alert(err.message || 'Ошибка при получении бонуса');
    } finally {
      setIsClaimingBonus(false);
    }
  };

  const loadHistory = async (pageNum: number, options?: { background?: boolean }) => {
    try {
      if (!options?.background) {
        setLoading(true);
      }
      const data = await apiClient.getHistory(pageNum, 10);
      setHistory(data.bets);
      setTotalPages(data.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки истории');
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadHistory(newPage);
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-content">
        {page === 1 && (
          <>
            <h3 className="profile-section-title">Ежедневный бонус</h3>
            <div className="daily-bonus-section">
              <button
                className={`daily-bonus-button ${!canClaimBonus ? 'disabled' : ''}`}
                onClick={handleClaimDailyBonus}
                disabled={!canClaimBonus || isClaimingBonus}
              >
                {isClaimingBonus ? (
                  'Получение...'
                ) : canClaimBonus ? (
                  <>
                    <svg className="daily-bonus-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Получить 500 баллов
                  </>
                ) : (
                  <>
                    <svg className="daily-bonus-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Уже получено сегодня
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <h3 className="profile-section-title">История ставок</h3>

        {error && <div className="profile-error">{error}</div>}

        {loading && !user ? (
          <div className="profile-loading">Загрузка...</div>
        ) : loading ? (
          <div className="profile-loading">Загрузка истории...</div>
        ) : history.length === 0 ? (
          <div className="profile-empty">Нет ставок</div>
        ) : (
          <>
            <div className="profile-history">
              {history.map((bet) => (
                <HistoryCard key={bet.id} bet={bet} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="profile-pagination">
                {getPaginationWindow(page, totalPages, 5).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-page ${page === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

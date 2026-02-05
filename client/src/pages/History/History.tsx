import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { getSocket } from '../../utils/socket';
import { getPaginationWindow } from '../../utils/pagination';
import { formatMoscowDate } from '../../utils/timezone';
import './History.css';

interface Match {
  id: number;
  team1: { id: number; name: string };
  team2: { id: number; name: string };
  start_time: string;
  result: 'P1' | 'P2' | null;
}

export function History() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches(1);
    const socket = getSocket();
    const handleMatchesHistoryUpdated = () => {
      loadMatches(1, { background: true });
    };
    socket.on('matchesHistoryUpdated', handleMatchesHistoryUpdated);

    return () => {
      socket.off('matchesHistoryUpdated', handleMatchesHistoryUpdated);
    };
  }, []);

  const loadMatches = async (pageNum: number, options?: { background?: boolean }) => {
    try {
      if (!options?.background) {
        setLoading(true);
      }
      const data = await apiClient.getMatchesHistory(pageNum, 10);
      setMatches(data.matches);
      setTotalPages(data.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки истории матчей');
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadMatches(newPage);
    }
  };

  return (
    <div className="history-screen">
      <div className="history-content">
        <h3 className="history-section-title">История матчей</h3>
        {loading ? (
          <div className="history-loading">Загрузка...</div>
        ) : error ? (
          <div className="history-error">{error}</div>
        ) : matches.length === 0 ? (
          <div className="history-empty">Нет завершенных матчей</div>
        ) : (
          <>
            <div className="history-list">
              {matches.map((match) => (
                <div key={match.id} className="history-match-card">
                  <div className="history-match-date">
                    {formatMoscowDate(match.start_time)}
                  </div>
                  <div className="history-match-teams">
                    <div
                      className={`history-match-team ${
                        match.result === 'P1' ? 'winner' : match.result === 'P2' ? 'loser' : ''
                      }`}
                    >
                      {match.team1.name}
                    </div>
                    <div className="history-match-vs">vs</div>
                    <div
                      className={`history-match-team ${
                        match.result === 'P2' ? 'winner' : match.result === 'P1' ? 'loser' : ''
                      }`}
                    >
                      {match.team2.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
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

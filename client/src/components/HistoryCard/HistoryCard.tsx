import './HistoryCard.css';

interface HistoryCardProps {
  bet: {
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
  };
}

export function HistoryCard({ bet }: HistoryCardProps) {
  const isWin = bet.status === 'win';
  const isLose = bet.status === 'lose';
  const isRefunded = bet.status === 'refunded';

  const team1 = bet.match.team1;
  const team2 = bet.match.team2;

  return (
    <div className={`history-card history-card-${bet.status}`}>
      <div className="history-card-match">
        <div
          className={`history-card-team ${
            bet.side === 'P1' && isWin ? 'winner' : ''
          } ${bet.side === 'P1' && isLose ? 'loser' : ''}`}
        >
          {team1}
        </div>
        <div className="history-card-vs">vs</div>
        <div
          className={`history-card-team ${
            bet.side === 'P2' && isWin ? 'winner' : ''
          } ${bet.side === 'P2' && isLose ? 'loser' : ''}`}
        >
          {team2}
        </div>
      </div>

      <div className="history-card-bet-info">
        <span className="history-card-bet-text">
          Ставка ({bet.side}) - {bet.amount.toFixed(2)} - {bet.coefficient.toFixed(2)}
        </span>
        {bet.status === 'win' && (
          <div className="history-card-win-amount">
            Выигрыш: {(bet.amount * bet.coefficient).toFixed(2)}
          </div>
        )}
        {isRefunded && (
          <div className="history-card-refunded">Ставка возвращена</div>
        )}
      </div>
    </div>
  );
}


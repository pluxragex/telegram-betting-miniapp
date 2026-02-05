import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { BetButton } from '../BetButton/BetButton';
import { ConfirmModal } from '../ConfirmModal/ConfirmModal';
import { isMatchStarted, formatMoscowTime } from '../../utils/timezone';
import { getSocket } from '../../utils/socket';
import './MatchCard.css';

interface MatchCardProps {
  match: {
    id: number;
    team1: { id: number; name: string; logo_url?: string | null };
    team2: { id: number; name: string; logo_url?: string | null };
    start_time: string;
    result: 'P1' | 'P2' | null;
    coefficients: { p1: number; p2: number };
  };
  onBetPlaced: () => void;
}

export function MatchCard({ match, onBetPlaced }: MatchCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [confirmBet, setConfirmBet] = useState<{ side: 'P1' | 'P2'; teamName: string } | null>(null);
  const [isStarted, setIsStarted] = useState(() => isMatchStarted(match.start_time));

  const isFinished = match.result !== null;

  useEffect(() => {
    setBetAmount('');
  }, [match.id]);

  useEffect(() => {
    setIsStarted(isMatchStarted(match.start_time));
  }, [match.start_time]);

  useEffect(() => {
    const socket = getSocket();
    const handleMatchStarted = (payload: { matchId: number }) => {
      if (payload.matchId === match.id) {
        setIsStarted(true);
      }
    };

    socket.on('matchStarted', handleMatchStarted);

    return () => {
      socket.off('matchStarted', handleMatchStarted);
    };
  }, [match.id]);

  const handleBetClick = (side: 'P1' | 'P2') => {
    if (isFinished || isStarted || !betAmount || betAmount.trim() === '') {
      return;
    }
    const teamName = side === 'P1' ? match.team1.name : match.team2.name;
    setConfirmBet({ side, teamName });
  };

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setBetAmount(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === '-' ||
      e.key === '+' ||
      e.key === '.' ||
      e.key === ',' ||
      e.key === 'e' ||
      e.key === 'E' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (/^\d+$/.test(pastedText)) {
      setBetAmount(pastedText);
    }
  };

  const isValidBetAmount = betAmount.trim() !== '' && parseInt(betAmount) > 0;

  const handleBetConfirm = async () => {
    if (!confirmBet || !isValidBetAmount) return;

    setLoading(true);
    setError(null);
    setConfirmBet(null);

    try {
      await apiClient.createBet({
        match_id: match.id,
        side: confirmBet.side,
        amount: parseInt(betAmount),
      });
      setBetAmount('');
      onBetPlaced();
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании ставки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="match-card">
      <div className="match-card-header">
        <div className="match-date">
          {formatMoscowTime(match.start_time)}
        </div>
        {isFinished && (
          <div className="match-status finished">Завершен</div>
        )}
        {!isFinished && isStarted && (
          <div className="match-status live">Идет игра</div>
        )}
      </div>

      <div className={`match-teams ${isStarted && !isFinished ? 'match-teams-live' : ''}`}>
        <div className={`match-team ${match.result === 'P1' ? 'winner' : ''}`}>
          <div className="match-team-name">{match.team1.name}</div>
          {!isFinished && !isStarted && (
            <BetButton
              side="P1"
              coefficient={match.coefficients.p1}
              onClick={() => handleBetClick('P1')}
              disabled={loading || !isValidBetAmount}
              betAmount={isValidBetAmount ? parseInt(betAmount) : undefined}
              backgroundImageUrl={match.team1.logo_url || null}
            />
          )}
          {!isFinished && isStarted && (
            <div
              className={`match-team-logo match-team-logo-p1 ${match.team1.logo_url ? 'has-logo' : ''}`}
              style={
                match.team1.logo_url
                  ? ({ ['--team-logo-bg' as any]: `url(${match.team1.logo_url})` } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="match-team-logo-side">P1</span>
            </div>
          )}
        </div>

        <div className={`match-vs ${!isStarted && !isFinished ? 'match-vs-betting' : ''} ${isStarted && !isFinished ? 'match-vs-live' : ''}`}>
          vs
        </div>

        <div className={`match-team ${match.result === 'P2' ? 'winner' : ''}`}>
          <div className="match-team-name">{match.team2.name}</div>
          {!isFinished && !isStarted && (
            <BetButton
              side="P2"
              coefficient={match.coefficients.p2}
              onClick={() => handleBetClick('P2')}
              disabled={loading || !isValidBetAmount}
              betAmount={isValidBetAmount ? parseInt(betAmount) : undefined}
              backgroundImageUrl={match.team2.logo_url || null}
            />
          )}
          {!isFinished && isStarted && (
            <div
              className={`match-team-logo match-team-logo-p2 ${match.team2.logo_url ? 'has-logo' : ''}`}
              style={
                match.team2.logo_url
                  ? ({ ['--team-logo-bg' as any]: `url(${match.team2.logo_url})` } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="match-team-logo-side">P2</span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="match-error">{error}</div>}

      {!isFinished && !isStarted && (
        <div className="match-bet-amount">
          <label>Сумма ставки:</label>
          <input
            type="text"
            inputMode="numeric"
            value={betAmount}
            onChange={handleBetAmountChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={loading}
            placeholder="Введите сумму"
          />
        </div>
      )}

      {confirmBet && (
        <ConfirmModal
          isOpen={true}
          title="Подтверждение ставки"
          message={`Вы уверены, что хотите поставить ${betAmount} баллов на команду "${confirmBet.teamName}"?`}
          confirmText="Уверен"
          cancelText="Отмена"
          type="info"
          onConfirm={handleBetConfirm}
          onCancel={() => setConfirmBet(null)}
        />
      )}
    </div>
  );
}


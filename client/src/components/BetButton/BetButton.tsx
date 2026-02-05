import './BetButton.css';

interface BetButtonProps {
  side: 'P1' | 'P2';
  coefficient: number;
  onClick: () => void;
  disabled?: boolean;
  betAmount?: number;
  backgroundImageUrl?: string | null;
}

export function BetButton({
  side,
  coefficient,
  onClick,
  disabled,
  betAmount,
  backgroundImageUrl,
}: BetButtonProps) {
  const potentialWin =
    typeof betAmount === 'number' && betAmount > 0
      ? betAmount * coefficient
      : null;

  return (
    <button
      className={`bet-button bet-button-${side.toLowerCase()} ${backgroundImageUrl ? 'has-logo' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={
        backgroundImageUrl
          ? ({ ['--bet-logo-bg' as any]: `url(${backgroundImageUrl})` } as React.CSSProperties)
          : undefined
      }
    >
      <span className="bet-button-side">{side}</span>
      <span className="bet-button-coefficient">{coefficient.toFixed(2)}</span>
      {potentialWin !== null && (
        <span className="bet-button-potential-win">
          Возможный выигрыш&nbsp;
          <span className="bet-button-potential-win-value">
            {potentialWin.toFixed(2)}
          </span>{' '}
        </span>
      )}
    </button>
  );
}


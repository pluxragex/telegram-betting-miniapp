import { getTelegramWebApp } from '../../utils/telegram';
import './SubscriptionModal.css';

interface SubscriptionModalProps {
  isOpen: boolean;
  channelId: string;
  onClose: () => void;
  onRetry: () => void;
}

export function SubscriptionModal({ isOpen, channelId, onClose, onRetry }: SubscriptionModalProps) {
  if (!isOpen) return null;

  const handleSubscribe = () => {
    const webApp = getTelegramWebApp();
    if (webApp && channelId) {
      const channelUrl = channelId.startsWith('@') 
        ? `https://t.me/${channelId.slice(1)}`
        : `https://t.me/${channelId}`;
      webApp.openTelegramLink(channelUrl);
    }
  };

  return (
    <div className="subscription-modal-overlay" onClick={onClose}>
      <div className="subscription-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="subscription-modal-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <h3 className="subscription-modal-title">Требуется подписка</h3>
        <p className="subscription-modal-message">
          Для участия необходимо подписаться на наш Telegram канал
        </p>
        <div className="subscription-modal-actions">
          <button className="subscription-modal-subscribe" onClick={handleSubscribe}>
            Подписаться
          </button>
          <button className="subscription-modal-retry" onClick={onRetry}>
            Проверить снова
          </button>
        </div>
      </div>
    </div>
  );
}

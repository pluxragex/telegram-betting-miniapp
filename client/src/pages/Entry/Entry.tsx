import { useState } from 'react';
import { apiClient } from '../../api/client';
import { getInitData } from '../../utils/telegram';
import { SubscriptionModal } from '../../components/SubscriptionModal/SubscriptionModal';
import './Entry.css';

const ENTRY_IMAGE_URL = 'https://i.ibb.co/FkWcYQyF/logo.png';

export function Entry({ onParticipate }: { onParticipate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [channelId, setChannelId] = useState('');

  const handleParticipate = async () => {
    setLoading(true);
    setError(null);

    try {
      const initData = getInitData();
      if (!initData) {
        throw new Error('Telegram WebApp не инициализирован');
      }

      await apiClient.authTelegram(initData);
      await apiClient.participate();

      onParticipate();
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка при участии';
      if (errorMessage.includes('подписаться')) {
        try {
          const subscriptionData = await apiClient.checkSubscription();
          setChannelId(subscriptionData.channelId);
          setShowSubscriptionModal(true);
        } catch (checkErr) {
          setError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySubscription = async () => {
    setLoading(true);
    setShowSubscriptionModal(false);

    try {
      await apiClient.participate();
      onParticipate();
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка при участии';
      if (errorMessage.includes('подписаться')) {
        setShowSubscriptionModal(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="entry-screen">
        <div className="entry-content">
          <div className="entry-logo">
            <img src={ENTRY_IMAGE_URL} alt="Logo" className="entry-image" />
          </div>
          <h1 className="entry-title">CORTEZ MASTERS</h1>
          <p className="entry-subtitle">by Вечерний Кортез</p>

          {error && <div className="entry-error">{error}</div>}

          <button
            className="button button-primary entry-button"
            onClick={handleParticipate}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Участвовать'}
          </button>
        </div>
      </div>
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        channelId={channelId}
        onClose={() => setShowSubscriptionModal(false)}
        onRetry={handleRetrySubscription}
      />
    </>
  );
}


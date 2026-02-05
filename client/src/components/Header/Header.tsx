import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { getSocket } from '../../utils/socket';
import '../ConfirmModal/ConfirmModal.css';
import './Header.css';

interface User {
  id: number;
  telegram_id: string;
  username?: string;
  display_name?: string;
  balance: number;
  isAdmin?: boolean;
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isBonusCodeModalOpen, setIsBonusCodeModalOpen] = useState(false);
  const [bonusCodeValue, setBonusCodeValue] = useState('');
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const [bonusCodeError, setBonusCodeError] = useState<string | null>(null);
  const [bonusCodeSuccess, setBonusCodeSuccess] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<User | null>(null);

  const hideHeader = location.pathname === '/entry';

  useEffect(() => {
    loadUser();
    checkAdmin();
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const socket = getSocket();

    const handleUserBetsUpdated = (payload: { userId: number }) => {
      if (userRef.current && payload.userId === userRef.current.id) {
        loadUser();
      }
    };

    socket.on('userBetsUpdated', handleUserBetsUpdated);

    return () => {
      socket.off('userBetsUpdated', handleUserBetsUpdated);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const loadUser = async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const data = await apiClient.checkIsAdmin();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleAdminClick = () => {
    navigate('/admin');
    setIsDropdownOpen(false);
  };

  const handleBonusCodeClick = () => {
    setIsBonusCodeModalOpen(true);
    setBonusCodeError(null);
    setBonusCodeSuccess(null);
    setBonusCodeValue('');
    setIsDropdownOpen(false);
  };

  const handleFAQClick = () => {
    navigate('/faq');
    setIsDropdownOpen(false);
  };

  const handleRedeemBonusCode = async () => {
    if (!bonusCodeValue.trim()) {
      setBonusCodeError('Введите бонус-код');
      setBonusCodeSuccess(null);
      return;
    }

    setBonusCodeError(null);
    setBonusCodeSuccess(null);
    setIsRedeemingCode(true);
    try {
      const result = await apiClient.redeemBonusCode(bonusCodeValue.trim().toUpperCase());
      setBonusCodeSuccess(`Бонус-код успешно активирован! Начислено ${result.value.toFixed(2)} баллов.`);
      setBonusCodeValue('');
      await loadUser();
      
      // Закрываем модалку через 2 секунды после успешной активации
      setTimeout(() => {
        setIsBonusCodeModalOpen(false);
        setBonusCodeSuccess(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error redeeming bonus code:', error);
      const errorMessage = error.message || 'Ошибка при активации бонус-кода';
      setBonusCodeError(errorMessage);
      setBonusCodeSuccess(null);
    } finally {
      setIsRedeemingCode(false);
    }
  };

  const handleEditNameClick = () => {
    setEditNameValue(user?.display_name || '');
    setIsEditNameModalOpen(true);
    setIsDropdownOpen(false);
  };

  const validateDisplayName = (name: string): string | null => {
    const cleanedName = name.replace(/\s/g, '');
    
    if (!cleanedName || cleanedName.length === 0) {
      return 'Имя не может быть пустым или состоять только из пробелов';
    }
    
    if (cleanedName.length > 16) {
      return 'Имя не может быть длиннее 16 символов';
    }
    
    if (!/[\p{L}\p{N}]/u.test(cleanedName)) {
      return 'Имя должно содержать хотя бы одну букву или цифру';
    }
    
    return null;
  };

  const handleSaveName = async () => {
    if (!user) return;
    
    setIsSavingName(true);
    try {
      const cleanedName = editNameValue.replace(/\s/g, '');
      
      if (!cleanedName || cleanedName.length === 0) {
        await apiClient.updateDisplayName(null);
        await loadUser();
        setIsEditNameModalOpen(false);
        setEditNameValue('');
        return;
      }
      
      const validationError = validateDisplayName(editNameValue);
      if (validationError) {
        alert(validationError);
        return;
      }
      
      const finalName = cleanedName.slice(0, 16);
      await apiClient.updateDisplayName(finalName);
      await loadUser();
      setIsEditNameModalOpen(false);
      setEditNameValue('');
    } catch (error: any) {
      console.error('Error updating display name:', error);
      alert(error.message || 'Ошибка при сохранении имени');
    } finally {
      setIsSavingName(false);
    }
  };

  const getDisplayName = () => {
    return user?.display_name || user?.username || user?.telegram_id || 'Пользователь';
  };

  if (hideHeader || loading || !user) return null;

  const tg = window.Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;
  const avatarUrl = tgUser?.photo_url;

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-content">
          {/* Логотип с иконкой и свечением */}
          <div className="header-logo-container" onClick={() => navigate('/')}>
            <div className="header-logo-icon-wrapper">
              <div className="header-logo-icon-glow"></div>
              <div className="header-logo-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
            </div>
            <div className="header-logo-text-container">
              <span className="header-logo-text">CORTEZ MASTERS</span>
              <p className="header-logo-subtext">by Вечерний Кортез</p>
            </div>
          </div>

          <div className="header-right-section" ref={dropdownRef}>
            <div className="header-dropdown-wrapper">
              <button
                className={`header-user-pill ${isDropdownOpen ? 'open' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseDown={(e) => e.preventDefault()}
                onFocus={(e) => e.currentTarget.blur()}
              >
                <div className="header-user-pill-balance">
                  <div className="header-user-pill-balance-value">{user.balance.toFixed(2)}</div>
                  <div className="header-user-pill-balance-label">баллов</div>
                </div>
                <div className="header-avatar-container">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.username || 'User'}
                      className="header-avatar-image"
                    />
                  ) : (
                    <div className="header-avatar-placeholder">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="header-overlay" onClick={() => setIsDropdownOpen(false)} />
                  <div className="header-dropdown">
                    <div className="header-dropdown-header">
                      <div className="header-dropdown-avatar-container">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user.username || 'User'}
                            className="header-dropdown-avatar"
                          />
                        ) : (
                          <div className="header-dropdown-avatar-placeholder">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="header-dropdown-user-info">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <div className="header-dropdown-username">{getDisplayName()}</div>
                          <button
                            onClick={handleEditNameClick}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 1px',
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--white-icon)',
                              transition: 'color 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--sec-light)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--white-icon)';
                            }}
                            title="Изменить отображаемое имя"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                        <div className="header-dropdown-balance">{user.balance.toFixed(2)} баллов</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        className="header-dropdown-item"
                        onClick={handleAdminClick}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginRight: '8px' }}
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          <path d="M9 12l2 2 4-4"></path>
                        </svg>
                        Администратор
                      </button>
                    )}
                    <button
                      className="header-dropdown-item"
                      onClick={handleBonusCodeClick}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: '8px' }}
                      >
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                      </svg>
                      Бонус-код
                    </button>
                    <button
                      className="header-dropdown-item"
                      onClick={handleFAQClick}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: '8px' }}
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      Вопрос & Ответ
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditNameModalOpen && createPortal(
        <div className="confirm-modal-overlay" onClick={() => setIsEditNameModalOpen(false)}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <h3 className="confirm-modal-title">Изменить отображаемое имя</h3>
            <p className="confirm-modal-message" style={{ marginBottom: '16px' }}>
              Это имя будет отображаться в рейтинге и в вашем профиле.
            </p>
            <input
              type="text"
              value={editNameValue}
              onChange={(e) => {
                // Автоматически убираем пробелы при вводе
                const value = e.target.value.replace(/\s/g, '');
                // Ограничиваем до 16 символов
                if (value.length <= 16) {
                  setEditNameValue(value);
                }
              }}
              placeholder="Введите имя (макс. 16 символов, без пробелов)"
              maxLength={16}
              className="edit-name-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveName();
                } else if (e.key === 'Escape') {
                  setIsEditNameModalOpen(false);
                }
              }}
              autoFocus
            />
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setIsEditNameModalOpen(false)}>
                Отмена
              </button>
              <button
                className="confirm-modal-confirm info"
                onClick={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isBonusCodeModalOpen && createPortal(
        <div className="confirm-modal-overlay" onClick={() => setIsBonusCodeModalOpen(false)}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
              </svg>
            </div>
            <h3 className="confirm-modal-title">Активация бонус-кода</h3>
            <p className="confirm-modal-message" style={{ marginBottom: '16px' }}>
              Введите бонус-код для получения баллов.
            </p>
            {bonusCodeSuccess && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  color: '#10b981',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'slideDown 0.3s ease',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>{bonusCodeSuccess}</span>
              </div>
            )}
            {bonusCodeError && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  color: '#ef4444',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'slideDown 0.3s ease',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{bonusCodeError}</span>
              </div>
            )}
            {!bonusCodeSuccess && (
              <input
              type="text"
              value={bonusCodeValue}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setBonusCodeValue(value);
              }}
              placeholder="Введите код"
              className="edit-name-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRedeemBonusCode();
                } else if (e.key === 'Escape') {
                  setIsBonusCodeModalOpen(false);
                }
              }}
                autoFocus
              />
            )}
            <div className="confirm-modal-actions">
              {bonusCodeSuccess ? (
                <button
                  className="confirm-modal-confirm info"
                  onClick={() => {
                    setIsBonusCodeModalOpen(false);
                    setBonusCodeSuccess(null);
                  }}
                  style={{ width: '100%' }}
                >
                  Закрыть
                </button>
              ) : (
                <>
                  <button className="confirm-modal-cancel" onClick={() => setIsBonusCodeModalOpen(false)}>
                    Отмена
                  </button>
                  <button
                    className="confirm-modal-confirm info"
                    onClick={handleRedeemBonusCode}
                    disabled={isRedeemingCode || !bonusCodeValue.trim()}
                  >
                    {isRedeemingCode ? 'Активация...' : 'Активировать'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}


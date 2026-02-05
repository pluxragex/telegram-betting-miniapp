import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import './Ranking.css';

interface RankingUser {
  rank: number;
  id: number;
  username: string;
  balance: number;
  prizeImage: string | null;
}

export function Ranking() {
  const [users, setUsers] = useState<RankingUser[]>([]);
  const [myUser, setMyUser] = useState<RankingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getRanking();
      setUsers(data.users || []);
      setMyUser(data.my || null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки рейтинга');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ranking-screen">
      <div className="ranking-content">
        <h3 className="ranking-section-title">Рейтинг ТОП-{users.length}</h3>
        {loading ? (
          <div className="ranking-loading">Загрузка...</div>
        ) : error ? (
          <div className="ranking-error">{error}</div>
        ) : users.length === 0 ? (
          <div className="ranking-empty">Нет пользователей</div>
        ) : (
          <>
            <div className="ranking-list">
              {users.map((user, index) => (
                <div
                  key={`${user.id}-${index}`}
                  className={`ranking-item ${index < 3 ? `ranking-top-${index + 1}` : ''}`}
                >
                  <div className="ranking-rank">
                    {index === 0 && (
                      <div className="ranking-medal ranking-medal-gold">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Внешний круг - рамка */}
                      <circle cx="24" cy="24" r="22" fill="url(#goldOuterGrad)" stroke="url(#goldStrokeGrad)" strokeWidth="2" />
                      {/* Внутренний круг */}
                      <circle cx="24" cy="24" r="18" fill="url(#goldInnerGrad)" />
                      {/* Лента сверху */}
                      <path d="M16 8C16 6 17.5 4 20 4H28C30.5 4 32 6 32 8V10C32 12 30.5 14 28 14H20C17.5 14 16 12 16 10V8Z" fill="url(#goldRibbonGrad)" />
                      {/* Звезда */}
                      <path d="M24 14L25.5 19L30.5 19L26.5 22L28 27L24 24L20 27L21.5 22L17.5 19L22.5 19L24 14Z" fill="url(#goldStarGrad)" />
                      {/* Цифра 1 */}
                      <text x="24" y="36" fontSize="16" fontWeight="700" fill="url(#goldTextGrad)" textAnchor="middle" fontFamily="Arial, sans-serif">1</text>
                      <defs>
                        <linearGradient id="goldOuterGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#FFD700" />
                          <stop offset="50%" stopColor="#FFA500" />
                          <stop offset="100%" stopColor="#FF8C00" />
                        </linearGradient>
                        <linearGradient id="goldStrokeGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#FFF8DC" />
                          <stop offset="100%" stopColor="#FF8C00" />
                        </linearGradient>
                        <radialGradient id="goldInnerGrad" cx="50%" cy="40%">
                          <stop offset="0%" stopColor="#FFF8DC" />
                          <stop offset="50%" stopColor="#FFD700" />
                          <stop offset="100%" stopColor="#FFA500" />
                        </radialGradient>
                        <linearGradient id="goldRibbonGrad" x1="24" y1="4" x2="24" y2="14">
                          <stop offset="0%" stopColor="#FFD700" />
                          <stop offset="100%" stopColor="#FF8C00" />
                        </linearGradient>
                        <linearGradient id="goldStarGrad" x1="24" y1="14" x2="24" y2="27">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="100%" stopColor="#FFD700" />
                        </linearGradient>
                        <linearGradient id="goldTextGrad" x1="24" y1="28" x2="24" y2="38">
                          <stop offset="0%" stopColor="#FF8C00" />
                          <stop offset="100%" stopColor="#654321" />
                        </linearGradient>
                      </defs>
                        </svg>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="ranking-medal ranking-medal-silver">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Внешний круг - рамка */}
                      <circle cx="24" cy="24" r="22" fill="url(#silverOuterGrad)" stroke="url(#silverStrokeGrad)" strokeWidth="2" />
                      {/* Внутренний круг */}
                      <circle cx="24" cy="24" r="18" fill="url(#silverInnerGrad)" />
                      {/* Лента сверху */}
                      <path d="M16 8C16 6 17.5 4 20 4H28C30.5 4 32 6 32 8V10C32 12 30.5 14 28 14H20C17.5 14 16 12 16 10V8Z" fill="url(#silverRibbonGrad)" />
                      {/* Звезда */}
                      <path d="M24 14L25.5 19L30.5 19L26.5 22L28 27L24 24L20 27L21.5 22L17.5 19L22.5 19L24 14Z" fill="url(#silverStarGrad)" />
                      {/* Цифра 2 */}
                      <text x="24" y="36" fontSize="16" fontWeight="700" fill="url(#silverTextGrad)" textAnchor="middle" fontFamily="Arial, sans-serif">2</text>
                      <defs>
                        <linearGradient id="silverOuterGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#E8E8E8" />
                          <stop offset="50%" stopColor="#C0C0C0" />
                          <stop offset="100%" stopColor="#A8A8A8" />
                        </linearGradient>
                        <linearGradient id="silverStrokeGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#F5F5F5" />
                          <stop offset="100%" stopColor="#808080" />
                        </linearGradient>
                        <radialGradient id="silverInnerGrad" cx="50%" cy="40%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="50%" stopColor="#E8E8E8" />
                          <stop offset="100%" stopColor="#C0C0C0" />
                        </radialGradient>
                        <linearGradient id="silverRibbonGrad" x1="24" y1="4" x2="24" y2="14">
                          <stop offset="0%" stopColor="#E8E8E8" />
                          <stop offset="100%" stopColor="#A8A8A8" />
                        </linearGradient>
                        <linearGradient id="silverStarGrad" x1="24" y1="14" x2="24" y2="27">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="100%" stopColor="#C0C0C0" />
                        </linearGradient>
                        <linearGradient id="silverTextGrad" x1="24" y1="28" x2="24" y2="38">
                          <stop offset="0%" stopColor="#606060" />
                          <stop offset="100%" stopColor="#404040" />
                        </linearGradient>
                      </defs>
                        </svg>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="ranking-medal ranking-medal-bronze">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Внешний круг - рамка */}
                      <circle cx="24" cy="24" r="22" fill="url(#bronzeOuterGrad)" stroke="url(#bronzeStrokeGrad)" strokeWidth="2" />
                      {/* Внутренний круг */}
                      <circle cx="24" cy="24" r="18" fill="url(#bronzeInnerGrad)" />
                      {/* Лента сверху */}
                      <path d="M16 8C16 6 17.5 4 20 4H28C30.5 4 32 6 32 8V10C32 12 30.5 14 28 14H20C17.5 14 16 12 16 10V8Z" fill="url(#bronzeRibbonGrad)" />
                      {/* Звезда */}
                      <path d="M24 14L25.5 19L30.5 19L26.5 22L28 27L24 24L20 27L21.5 22L17.5 19L22.5 19L24 14Z" fill="url(#bronzeStarGrad)" />
                      {/* Цифра 3 */}
                      <text x="24" y="36" fontSize="16" fontWeight="700" fill="url(#bronzeTextGrad)" textAnchor="middle" fontFamily="Arial, sans-serif">3</text>
                      <defs>
                        <linearGradient id="bronzeOuterGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#E6A857" />
                          <stop offset="50%" stopColor="#CD7F32" />
                          <stop offset="100%" stopColor="#B87333" />
                        </linearGradient>
                        <linearGradient id="bronzeStrokeGrad" x1="24" y1="2" x2="24" y2="46">
                          <stop offset="0%" stopColor="#F4D03F" />
                          <stop offset="100%" stopColor="#8B4513" />
                        </linearGradient>
                        <radialGradient id="bronzeInnerGrad" cx="50%" cy="40%">
                          <stop offset="0%" stopColor="#F4D03F" />
                          <stop offset="50%" stopColor="#E6A857" />
                          <stop offset="100%" stopColor="#CD7F32" />
                        </radialGradient>
                        <linearGradient id="bronzeRibbonGrad" x1="24" y1="4" x2="24" y2="14">
                          <stop offset="0%" stopColor="#E6A857" />
                          <stop offset="100%" stopColor="#B87333" />
                        </linearGradient>
                        <linearGradient id="bronzeStarGrad" x1="24" y1="14" x2="24" y2="27">
                          <stop offset="0%" stopColor="#FFF8DC" />
                          <stop offset="100%" stopColor="#CD7F32" />
                        </linearGradient>
                        <linearGradient id="bronzeTextGrad" x1="24" y1="28" x2="24" y2="38">
                          <stop offset="0%" stopColor="#8B4513" />
                          <stop offset="100%" stopColor="#654321" />
                        </linearGradient>
                      </defs>
                        </svg>
                      </div>
                    )}
                    {index >= 3 && `#${user.rank}`}
                  </div>
                  <div className="ranking-user">
                    <div className="ranking-username">{user.username}</div>
                    <div className="ranking-balance">{user.balance.toFixed(2)} баллов</div>
                  </div>
                  {user.prizeImage && (
                    <div className="ranking-prize-image">
                      <img src={user.prizeImage} alt={`Prize ${user.rank}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {myUser && (
              <div className="ranking-my-place-wrapper">
                <div className="ranking-item ranking-my-place">
                  <div className="ranking-rank">
                    {myUser.rank > 100 ? '#100+' : `#${myUser.rank}`}
                  </div>
                  <div className="ranking-user">
                    <div className="ranking-username">{myUser.username}</div>
                    <div className="ranking-balance">{myUser.balance.toFixed(2)} баллов</div>
                  </div>
                  {myUser.prizeImage && (
                    <div className="ranking-prize-image">
                      <img src={myUser.prizeImage} alt={`My prize ${myUser.rank}`} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

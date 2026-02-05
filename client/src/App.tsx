import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initTelegramWebApp } from './utils/telegram';
import { apiClient } from './api/client';
import { Entry } from './pages/Entry/Entry';
import { Main } from './pages/Main/Main';
import { Group } from './pages/Group/Group';
import { History } from './pages/History/History';
import { Ranking } from './pages/Ranking/Ranking';
import { Profile } from './pages/Profile/Profile';
import { Admin } from './pages/Admin/Admin';
import { FAQ } from './pages/FAQ/FAQ';
import { Header } from './components/Header/Header';
import { BottomMenu } from './components/BottomMenu/BottomMenu';
import './styles/global.css';

function App() {
  const [hasParticipated, setHasParticipated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTelegramWebApp();

    checkParticipation();
  }, []);

  const checkParticipation = async () => {
    try {
      const user = await apiClient.getMe();
      setHasParticipated(user.participation);
    } catch (error) {
      setHasParticipated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = () => {
    setHasParticipated(true);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Загрузка...
      </div>
    );
  }

  if (!hasParticipated) {
    return (
      <BrowserRouter>
        <Entry onParticipate={handleParticipate} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/group/:groupId" element={<Group />} />
        <Route path="/history" element={<History />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomMenu />
    </BrowserRouter>
  );
}

export default App;


import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { loadAssets } from './engine/assets';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { JoinPage } from './pages/JoinPage';
import { SetupPage } from './pages/SetupPage';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';

export const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    // Simulate smooth filling if assets cache quickly, but track real asset load
    const minLoadTimeMs = 400;
    const start = performance.now();

    loadAssets((fraction) => {
      if (mounted) {
        setProgress(fraction);
      }
    })
      .then(() => {
        const elapsed = performance.now() - start;
        const remaining = Math.max(0, minLoadTimeMs - elapsed);
        setTimeout(() => {
          if (mounted) {
            setProgress(1);
            setLoading(false);
          }
        }, remaining);
      })
      .catch((err) => {
        console.error('Asset preloading error:', err);
        // Continue even if an optional asset failed
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/room/:code" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

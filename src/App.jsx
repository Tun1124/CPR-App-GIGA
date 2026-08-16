import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { loadModel } from './utils/mediapipe';
import Home from './pages/Home';
import VideoEvaluation from './pages/VideoEvaluation';
import RhythmGame from './pages/RhythmGame';
import Result from './pages/Result';
import Ranking from './pages/Ranking';

export default function App() {
  useEffect(() => {
    // アプリ起動時にバックグラウンドでモデルをプリロード
    loadModel().catch(console.error);
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/evaluate" element={<VideoEvaluation />} />
        <Route path="/game" element={<RhythmGame />} />
        <Route path="/result" element={<Result />} />
        <Route path="/ranking" element={<Ranking />} />
      </Routes>
    </HashRouter>
  );
}

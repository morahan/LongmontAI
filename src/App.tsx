import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';

const Edition = lazy(() => import('./pages/Edition'));
const Countdown = lazy(() => import('./pages/Countdown'));
const ToolsPage = lazy(() => import('./pages/Tools'));
const ModelWatch = lazy(() => import('./pages/ModelWatch'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Newsletter = lazy(() => import('./pages/Newsletter'));

function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={(
          <div className="min-h-[40vh]" role="status" aria-live="polite">
            <span className="sr-only">Loading page…</span>
          </div>
        )}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/edition/:id" element={<Edition />} />
            {/* Placeholder for about page */}
            <Route path="/countdown" element={<Countdown />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/model-watch" element={<ModelWatch />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/about" element={
              <div className="text-center py-20">
                <h1 className="text-4xl font-bold mb-4">About AI Innovations</h1>
                <p className="text-[var(--text-secondary)]">Curating the future, one update at a time.</p>
              </div>
            } />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;

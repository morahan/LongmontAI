import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Link, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import { useDocumentTitle } from './lib/documentTitle';

const Edition = lazy(() => import('./pages/Edition'));
const Countdown = lazy(() => import('./pages/Countdown'));
const ToolsPage = lazy(() => import('./pages/Tools'));
const ModelWatch = lazy(() => import('./pages/ModelWatch'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Newsletter = lazy(() => import('./pages/Newsletter'));

const routeTitles: Readonly<Record<string, string | undefined>> = {
  '/': undefined,
  '/countdown': 'Meetup Countdown',
  '/tools': 'AI Capabilities Matrix',
  '/model-watch': 'Model Watch',
  '/leaderboard': 'Leaderboard',
  '/timeline': 'AI Timeline',
  '/newsletter': 'Newsletter',
  '/about': 'About',
};

function RouteDocumentTitle() {
  const location = useLocation();
  const label = location.pathname.startsWith('/edition/')
    ? 'Edition'
    : Object.prototype.hasOwnProperty.call(routeTitles, location.pathname)
      ? routeTitles[location.pathname]
      : 'Page Not Found';
  useDocumentTitle(label);
  return null;
}

function NotFound() {
  return (
    <section className="text-center py-20" aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="text-4xl font-bold mb-4">Page not found</h1>
      <p className="text-[var(--text-secondary)] mb-8">The page you requested is unavailable.</p>
      <Link to="/" className="inline-block px-6 py-3 rounded-full border border-[var(--glass-border)] hover:bg-[var(--accent-cyan)] hover:text-black hover:border-[var(--accent-cyan)] transition-all duration-300 font-medium">
        Back to editions
      </Link>
    </section>
  );
}

function App() {
  return (
    <Router>
      <RouteDocumentTitle />
      <Layout>
        <Suspense fallback={(
          <div className="min-h-[40vh]" role="status" aria-live="polite">
            <span className="sr-only">Loading page…</span>
          </div>
        )}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/edition/:id" element={<Edition />} />
            <Route path="/countdown" element={<Countdown />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/model-watch" element={<ModelWatch />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/about" element={
              <section className="text-center py-20" aria-labelledby="about-title">
                <h1 id="about-title" className="text-4xl font-bold mb-4">About LongmontAI</h1>
                <p className="text-[var(--text-secondary)]">Curating the future, one update at a time for the Longmont AI community.</p>
              </section>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;

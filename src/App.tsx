import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Link, Routes, Route, useLocation } from 'react-router-dom';
import { routeTitle, useDocumentTitle } from './lib/documentTitle';
import Layout from './components/Layout';
import Feed from './pages/Feed';

const Edition = lazy(() => import('./pages/Edition'));
const Countdown = lazy(() => import('./pages/Countdown'));
const ToolsPage = lazy(() => import('./pages/Tools'));
const ModelWatch = lazy(() => import('./pages/ModelWatch'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Newsletter = lazy(() => import('./pages/Newsletter'));

function RouteDocumentTitle() {
  const { pathname } = useLocation();
  useDocumentTitle(routeTitle(pathname));
  return null;
}

function NotFound() {
  return (
    <section className="text-center py-20" aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="text-4xl font-bold mb-4">Page not found</h1>
      <p className="text-[var(--text-secondary)] mb-8">The page you requested is unavailable.</p>
      <Link to="/">Back to editions</Link>
    </section>
  );
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="text-center py-20" role="alert">
        <h1 className="text-4xl font-bold mb-4">Unable to load this page</h1>
        <p className="text-[var(--text-secondary)] mb-8">Please reload to try again, or return to editions.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        {' · '}<Link to="/">Back to editions</Link>
      </section>
    );
  }
}

function PageBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <PageErrorBoundary key={location.key}>{children}</PageErrorBoundary>;
}

function App() {
  return (
    <Router>
      <RouteDocumentTitle />
      <Layout>
        <PageBoundary>
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
              <div className="text-center py-20">
                <h1 className="text-4xl font-bold mb-4">About AI Innovations</h1>
                <p className="text-[var(--text-secondary)]">Curating the future, one update at a time.</p>
              </div>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </PageBoundary>
      </Layout>
    </Router>
  );
}

export default App;

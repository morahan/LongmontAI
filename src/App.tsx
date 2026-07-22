import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Edition from './pages/Edition';
import Countdown from './pages/Countdown';
import ToolsPage from './pages/Tools';
import ModelWatch from './pages/ModelWatch';
import Leaderboard from './pages/Leaderboard';
import Timeline from './pages/Timeline';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/edition/:id" element={<Edition />} />
          {/* Placeholder for about page */}
          <Route path="/countdown" element={<Countdown />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/model-watch" element={<ModelWatch />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/about" element={
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold mb-4">About AI Innovations</h1>
              <p className="text-[var(--text-secondary)]">Curating the future, one update at a time.</p>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Edition from './pages/Edition';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/edition/:id" element={<Edition />} />
          {/* Placeholder for about page */}
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

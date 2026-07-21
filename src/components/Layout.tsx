import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BrainCircuit, ExternalLink, Users, BookOpen, Clock, Github, Menu, Trophy, X, Network } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Skip to main content — first focusable element */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:right-0 focus:z-[100] focus:bg-[var(--accent-cyan)] focus:text-black focus:text-center focus:py-3 focus:px-4 focus:font-semibold focus:text-sm"
            >
                Skip to main content
            </a>

            {/* Background Elements */}
            <div className="bg-mesh" />

            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 header-glass">
                <nav aria-label="Main navigation" className="container h-16 sm:h-20 flex flex-row items-center justify-between px-4 sm:px-0">
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                        <img
                            src="/brand/logo/logo-128.png"
                            alt="LongmontAI logo"
                            className="w-9 h-9 rounded-lg border border-white/10 transition-colors"
                        />
                        <span className="font-bold tracking-tight text-base sm:text-lg">LongmontAI</span>
                    </Link>
                    <div className="desktop-nav">
                        <Link
                            to="/"
                            aria-label="Blog"
                            title="Blog"
                            className={`nav-link${location.pathname === '/' ? ' is-active' : ''}`}
                        >
                            <BookOpen size={16} />
                            <span>Blog</span>
                        </Link>
                        <Link
                            to="/model-watch"
                            aria-label="Model Watch"
                            title="Model Watch"
                            className={`nav-link${location.pathname === '/model-watch' ? ' is-active' : ''}`}
                        >
                            <Activity size={16} />
                            <span>Model Watch</span>
                        </Link>
                        <Link
                            to="/leaderboard"
                            aria-label="Leaderboard"
                            title="Leaderboard"
                            className={`nav-link${location.pathname === '/leaderboard' ? ' is-active' : ''}`}
                        >
                            <Trophy size={16} />
                            <span>Leaderboard</span>
                        </Link>
                        <Link
                            to="/timeline"
                            aria-label="AI Timeline"
                            title="AI Timeline"
                            className={`nav-link${location.pathname === '/timeline' ? ' is-active' : ''}`}
                        >
                            <Network size={16} />
                            <span>Timeline</span>
                        </Link>
                        <a
                            href="https://github.com/morahan/LongmontAI"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View LongmontAI on GitHub"
                            title="GitHub"
                            className="nav-link"
                        >
                            <Github size={16} />
                            <span>GitHub</span>
                        </a>
                        <Link
                            to="/countdown"
                            aria-label="Countdown"
                            title="Countdown"
                            className={`nav-link nav-link-button${location.pathname === '/countdown' ? ' is-active' : ''}`}
                        >
                            <Clock size={14} />
                            <span>Countdown</span>
                        </Link>
                    </div>
                    <button
                        type="button"
                        className="mobile-menu-trigger"
                        aria-expanded={isMobileNavOpen}
                        aria-controls="mobile-main-navigation"
                        onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
                    >
                        {isMobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
                        <span>Menu</span>
                    </button>
                </nav>
                {isMobileNavOpen && (
                    <div id="mobile-main-navigation" className="mobile-nav-panel">
                        <div className="container mobile-nav-grid">
                            <Link to="/" className={`mobile-nav-link${location.pathname === '/' ? ' is-active' : ''}`}>
                                <BookOpen size={16} aria-hidden="true" />
                                <span>Blog</span>
                            </Link>
                            <Link to="/model-watch" className={`mobile-nav-link${location.pathname === '/model-watch' ? ' is-active' : ''}`}>
                                <Activity size={16} aria-hidden="true" />
                                <span>Model Watch</span>
                            </Link>
                            <Link to="/leaderboard" className={`mobile-nav-link${location.pathname === '/leaderboard' ? ' is-active' : ''}`}>
                                <Trophy size={16} aria-hidden="true" />
                                <span>Leaderboard</span>
                            </Link>
                            <Link to="/timeline" className={`mobile-nav-link${location.pathname === '/timeline' ? ' is-active' : ''}`}>
                                <Network size={16} aria-hidden="true" />
                                <span>Timeline</span>
                            </Link>
                            <Link to="/countdown" className={`mobile-nav-link${location.pathname === '/countdown' ? ' is-active' : ''}`}>
                                <Clock size={16} aria-hidden="true" />
                                <span>Countdown</span>
                            </Link>
                            <a
                                href="https://github.com/morahan/LongmontAI"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mobile-nav-link"
                            >
                                <Github size={16} aria-hidden="true" />
                                <span>GitHub</span>
                            </a>
                            <a
                                href="https://www.meetup.com/longmontai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mobile-nav-link"
                            >
                                <Users size={16} aria-hidden="true" />
                                <span>Meetup</span>
                            </a>
                        </div>
                    </div>
                )}
            </header>

            <main
                id="main-content"
                className={`flex-grow pt-32 pb-20${location.pathname === '/' ? ' home-main' : ''}`}
            >
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="container"
                >
                    {children}
                </motion.div>
            </main>

            <footer role="contentinfo" className="border-t border-[var(--glass-border)] bg-[#09090b] py-12 mt-auto">
                <div className="container">
                    {/* Top section: Brand + Tagline */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-10">
                        {/* Brand */}
                        <div className="md:max-w-xs">
                            <Link to="/" className="flex items-center gap-3 group mb-3">
                                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5">
                                    <BrainCircuit size={20} className="text-[var(--accent-cyan)]" />
                                </div>
                                <span className="font-bold tracking-tight text-lg">LongmontAI</span>
                            </Link>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                Curated insights into the rapidly evolving world of AI.
                            </p>
                        </div>

                        {/* Footer Navigation */}
                        <nav aria-label="Footer navigation" className="flex flex-col sm:flex-row gap-10 sm:gap-16">
                            {/* Quick Links */}
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                                    Quick Links
                                </h3>
                                <ul className="space-y-2.5">
                                    <li>
                                        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Home
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Latest Edition
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/model-watch" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Model Watch
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/leaderboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Leaderboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/timeline" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            AI Timeline
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/tools" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                            Tools Used
                                        </Link>
                                    </li>
                                    <li>
                                        <a
                                            href="https://www.meetup.com/longmontai"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm inline-flex items-center gap-1.5"
                                        >
                                            Meetup Page
                                            <ExternalLink size={12} className="opacity-60" />
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Connect */}
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                                    Connect
                                </h3>
                                <ul className="flex gap-3">
                                    <li>
                                        <a
                                            href="https://www.meetup.com/longmontai"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Join us on Meetup"
                                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            <Users size={16} />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </nav>
                    </div>

                    {/* Bottom copyright */}
                    <div className="border-t border-[var(--glass-border)] pt-6">
                        <p className="text-[var(--text-muted)] text-sm text-center">
                            © {new Date().getFullYear()} LongmontAI. Curated by Intelligence.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;

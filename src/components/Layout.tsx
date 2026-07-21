import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BrainCircuit, ExternalLink, Users, BookOpen, Clock, Github, Mail, Menu, Trophy, X, Network } from 'lucide-react';

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

            <footer role="contentinfo" className="site-footer">
                <div className="container site-footer-inner">
                    <div className="site-footer-grid">
                        <div className="site-footer-brand">
                            <Link to="/" className="site-footer-brand-link">
                                <span className="site-footer-mark" aria-hidden="true">
                                    <BrainCircuit size={21} />
                                </span>
                                <span>LongmontAI</span>
                            </Link>
                            <p>Curated insights into the rapidly evolving world of AI.</p>
                        </div>

                        <nav aria-label="Footer navigation" className="site-footer-nav">
                            <div className="site-footer-column">
                                <h3>Explore</h3>
                                <ul>
                                    <li><Link to="/" className="site-footer-link">Home</Link></li>
                                    <li><Link to="/" className="site-footer-link">Latest Edition</Link></li>
                                    <li><Link to="/model-watch" className="site-footer-link">Model Watch</Link></li>
                                    <li><Link to="/leaderboard" className="site-footer-link">Leaderboard</Link></li>
                                    <li><Link to="/timeline" className="site-footer-link">AI Timeline</Link></li>
                                    <li><Link to="/tools" className="site-footer-link">Tools</Link></li>
                                </ul>
                            </div>

                            <div className="site-footer-column site-footer-connect">
                                <h3>Connect</h3>
                                <a
                                    href="https://www.meetup.com/longmontai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="site-footer-meetup-link"
                                >
                                    <Users size={17} aria-hidden="true" />
                                    <span>Meetup</span>
                                    <ExternalLink size={13} aria-hidden="true" />
                                </a>
                                <p className="site-footer-invitation">
                                    Put your brand in front of local builders, leaders, and AI enthusiasts.{' '}
                                    <a href="mailto:sponsors@longmontai.com?subject=LongmontAI%20event%20sponsorship">
                                        Sponsors@LongmontAI.com
                                    </a>
                                </p>
                            </div>

                            <div className="site-footer-column site-footer-present">
                                <h3>Present</h3>
                                <p className="site-footer-invitation">
                                    Share a practical idea, new tool, or live demo with the Longmont AI community.
                                </p>
                                <a
                                    href="mailto:hello@longmontai.com?subject=LongmontAI%20presentation%20or%20demo"
                                    className="site-footer-email-link"
                                >
                                    <Mail size={15} aria-hidden="true" />
                                    <span>Hello@LongmontAI.com</span>
                                </a>
                            </div>
                        </nav>
                    </div>

                    <div className="site-footer-bottom">
                        <p>© {new Date().getFullYear()} LongmontAI</p>
                        <a
                            href="https://morahan.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="site-footer-credit"
                        >
                            Designed by Michael Morahan.
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;

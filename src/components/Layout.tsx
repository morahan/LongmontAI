import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background Elements */}
            <div className="bg-mesh" />
            <div className="orb orb-1" />
            <div className="orb orb-2" />

            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 header-glass">
                <div className="container h-20 flex flex-row items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors border border-white/5">
                            <BrainCircuit size={20} className="text-[var(--accent-cyan)]" />
                        </div>
                        <span className="font-bold tracking-tight text-lg">Longmont AI - Meetup</span>
                    </Link>




                </div>
            </header>

            <main className="flex-grow pt-32 pb-20">
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

            <footer className="border-t border-[var(--glass-border)] py-12 mt-auto">
                <div className="container text-center">
                    <p className="text-[var(--text-muted)] text-sm">© {new Date().getFullYear()} AI Innovations. Curated by Intelligence.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;

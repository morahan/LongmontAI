import React from 'react';
import { ArrowRight, Bot, Database, MailCheck, RadioTower, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsletterSignupHost from '../components/NewsletterSignupHost';

const Newsletter: React.FC = () => (
  <div className="newsletter-page">
    <section className="newsletter-hero" aria-labelledby="newsletter-title">
      <div>
        <div className="newsletter-eyebrow">
          <Sparkles size={16} aria-hidden="true" />
          AI-curated briefing
        </div>
        <h1 id="newsletter-title">The LongmontAI AI Briefing</h1>
        <p>
          A weekly or bi-weekly synthesis of model releases, frontier benchmarks, agent workflows,
          research breakthroughs, and the strongest signals from the LongmontAI archive.
        </p>
      </div>
      <div className="newsletter-hero-panel" aria-label="Newsletter signup">
        <NewsletterSignupHost source="newsletter-page" />
      </div>
    </section>

    <section className="newsletter-signal-grid" aria-label="Newsletter source coverage">
      <article>
        <RadioTower size={18} aria-hidden="true" />
        <h2>Model Watch</h2>
        <p>Official sources are swept for new model names, availability shifts, and source health.</p>
        <Link to="/model-watch">Open Model Watch <ArrowRight size={14} aria-hidden="true" /></Link>
      </article>
      <article>
        <Database size={18} aria-hidden="true" />
        <h2>Benchmarks</h2>
        <p>Comparable benchmark movement is separated from hype before it becomes newsletter copy.</p>
        <Link to="/leaderboard">View Leaderboard <ArrowRight size={14} aria-hidden="true" /></Link>
      </article>
      <article>
        <Bot size={18} aria-hidden="true" />
        <h2>AI Curation</h2>
        <p>The draft generator uses LongmontAI pages as first-party context alongside monitored sources.</p>
        <Link to="/timeline">Trace Timeline <ArrowRight size={14} aria-hidden="true" /></Link>
      </article>
      <article>
        <MailCheck size={18} aria-hidden="true" />
        <h2>Newsletter Ops</h2>
        <p>Supabase captures consent, Listmonk manages audiences and campaigns, and Resend sends mail.</p>
        <a href="mailto:hello@longmontai.com?subject=LongmontAI%20newsletter">Contact LongmontAI <ArrowRight size={14} aria-hidden="true" /></a>
      </article>
    </section>
  </div>
);

export default Newsletter;

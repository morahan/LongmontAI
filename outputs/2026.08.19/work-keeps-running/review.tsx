import React from 'react';
import { createRoot } from 'react-dom/client';
import { Calendar, ExternalLink } from 'lucide-react';

import '../../../src/index.css';
import './review.css';
import ContentBlock from '../../../src/components/ContentBlock';
import draft from '../../../src/articles/drafts/2026.08.19-work-keeps-running.md?raw';
import coverUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/work-keeps-running-cover.png?url';
import grokBotUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/grok-bot.png?url';
import weatherNextUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/weathernext-cyclones.png?url';
import physicalAiFlywheelUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/physical-ai-flywheel.png?url';
import humanoidSensorHaloUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/humanoid-sensor-halo.png?url';
import robotAutonomyClosedLoopUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/robot-autonomy-closed-loop.png?url';
import gaussianSplatSimPipelineUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/gaussian-splat-sim-pipeline.png?url';
import onboardModelTradeoffUrl from '../../../src/articles/drafts/assets/2026.08.19/source-media/onboard-model-tradeoff.png?url';

const slideTitles = [
  'The work keeps running',
  'Five moves',
  'Grok Bot is a computer',
  'Local agents get serious',
  'Route for cost. Then speed.',
  'A bound moved. The hypothesis did not.',
  'One more day',
  'Hardware sets the floor',
  'Hand it off. Verify it.',
];

const slides = slideTitles.map((title, index) => ({
  title,
  src: `./presentation-source/slides-png/slide-${String(index + 1).padStart(2, '0')}.png`,
}));

const markdown = draft
  .replace(/^---[\s\S]*?---\s*/, '')
  .replace('/weekly-screenshots/2026.08.19/work-keeps-running-cover.png', coverUrl)
  .replace('/weekly-screenshots/2026.08.19/grok-bot.png', grokBotUrl)
  .replace('/weekly-screenshots/2026.08.19/weathernext-cyclones.png', weatherNextUrl)
  .replace('/weekly-screenshots/2026.08.19/physical-ai-flywheel.png', physicalAiFlywheelUrl)
  .replace('/weekly-screenshots/2026.08.19/humanoid-sensor-halo.png', humanoidSensorHaloUrl)
  .replace('/weekly-screenshots/2026.08.19/robot-autonomy-closed-loop.png', robotAutonomyClosedLoopUrl)
  .replace('/weekly-screenshots/2026.08.19/gaussian-splat-sim-pipeline.png', gaussianSplatSimPipelineUrl)
  .replace('/weekly-screenshots/2026.08.19/onboard-model-tradeoff.png', onboardModelTradeoffUrl);

const reviewSlideshows = {
  'work-keeps-running': {
    id: 'work-keeps-running',
    title: 'The work keeps running',
    description: 'Nine concise slides built from primary sources and original comparisons.',
    slides,
  },
};

function Review() {
  return (
    <main className="draft-review-shell">
      <div className="review-status">
        <span>Private editorial review</span>
        <span>Not published</span>
        <a href="./source-ledger.md" target="_blank" rel="noreferrer">
          Source ledger <ExternalLink size={14} />
        </a>
      </div>
      <article className="article-layout review-article">
        <header className="review-header">
          <div className="review-date"><Calendar size={17} /> August 19, 2026</div>
          <h1>The work keeps running</h1>
          <p>Models, persistent agents, checked science, and the physical constraints beneath the stack.</p>
        </header>
        <ContentBlock markdown={markdown} slideshows={reviewSlideshows} />
      </article>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Review />);

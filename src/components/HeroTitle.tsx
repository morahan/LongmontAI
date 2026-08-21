import React from 'react';

type AnimationVariant = 'map-route' | 'bearing-lock' | 'signal-horizon';

type Translation = {
    text: string;
    lang: string;
    dir: 'ltr' | 'rtl';
    script: 'latin' | 'cjk' | 'arabic' | 'hebrew' | 'devanagari';
    color: string;
};

const englishTranslation: Translation = {
    text: 'Intelligence Age',
    lang: 'en',
    dir: 'ltr',
    script: 'latin',
    color: '#93c5fd',
};

const animationVariants: AnimationVariant[] = ['map-route', 'bearing-lock', 'signal-horizon'];
const ENGLISH_DURATION_MS = 15_000;
const FOREIGN_BLOCK_DURATION_MS = 10_000;

function foreignSlotDuration(blockSize: 2 | 3, slot: number): number {
    const evenDuration = Math.floor(FOREIGN_BLOCK_DURATION_MS / blockSize);
    return slot === blockSize - 1
        ? FOREIGN_BLOCK_DURATION_MS - evenDuration * (blockSize - 1)
        : evenDuration;
}

type CadenceState = {
    phase: 'english' | 'foreign';
    foreignIndex: number;
    foreignSlot: number;
    foreignBlockSize: 2 | 3;
};

const initialCadence: CadenceState = {
    phase: 'english',
    foreignIndex: 0,
    foreignSlot: 0,
    foreignBlockSize: 2,
};

const foreignTranslations: Translation[] = [
    { text: 'La era de la inteligencia', lang: 'es', dir: 'ltr', script: 'latin', color: '#a5b4fc' },
    { text: 'L’ère de l’intelligence', lang: 'fr', dir: 'ltr', script: 'latin', color: '#c4b5fd' },
    { text: '知能の時代', lang: 'ja', dir: 'ltr', script: 'cjk', color: '#7dd3fc' },
    { text: 'عصر الذكاء', lang: 'ar', dir: 'rtl', script: 'arabic', color: '#67e8f9' },
    { text: 'बुद्धिमत्ता का युग', lang: 'hi', dir: 'ltr', script: 'devanagari', color: '#a7f3d0' },
    { text: 'עידן הבינה', lang: 'he', dir: 'rtl', script: 'hebrew', color: '#bfdbfe' },
];

function reducedMotionIsPreferred(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const HeroTitle: React.FC = () => {
    const [animationVariant, setAnimationVariant] = React.useState<AnimationVariant | 'static'>('static');
    const selectedVariant = React.useRef<AnimationVariant | null>(null);
    const [cadence, setCadence] = React.useState<CadenceState>(initialCadence);
    const [reducedMotion, setReducedMotion] = React.useState(reducedMotionIsPreferred);
    const [pageVisible, setPageVisible] = React.useState(
        () => typeof document === 'undefined' || document.visibilityState === 'visible'
    );
    const remainingPhaseTime = React.useRef(ENGLISH_DURATION_MS);
    const phaseStartedAt = React.useRef(0);
    const phaseCompleted = React.useRef(false);

    React.useEffect(() => {
        if (selectedVariant.current === null) {
            selectedVariant.current = animationVariants[Math.floor(Math.random() * animationVariants.length)];
            setAnimationVariant(selectedVariant.current);
        }
    }, []);

    React.useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handlePreferenceChange = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches);
            if (event.matches) {
                remainingPhaseTime.current = ENGLISH_DURATION_MS;
                setCadence(initialCadence);
            }
        };

        preference.addEventListener('change', handlePreferenceChange);
        return () => preference.removeEventListener('change', handlePreferenceChange);
    }, []);

    React.useEffect(() => {
        const handleVisibilityChange = () => setPageVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    React.useEffect(() => {
        if (reducedMotion) {
            remainingPhaseTime.current = ENGLISH_DURATION_MS;
            return undefined;
        }

        if (!pageVisible) {
            return undefined;
        }

        phaseStartedAt.current = Date.now();
        phaseCompleted.current = false;

        const timeout = window.setTimeout(() => {
            phaseCompleted.current = true;

            setCadence((current) => {
                if (current.phase === 'english') {
                    remainingPhaseTime.current = foreignSlotDuration(current.foreignBlockSize, 0);
                    return { ...current, phase: 'foreign' };
                }

                const nextForeignIndex = (current.foreignIndex + 1) % foreignTranslations.length;
                if (current.foreignSlot + 1 < current.foreignBlockSize) {
                    const nextForeignSlot = current.foreignSlot + 1;
                    remainingPhaseTime.current = foreignSlotDuration(current.foreignBlockSize, nextForeignSlot);
                    return {
                        ...current,
                        foreignIndex: nextForeignIndex,
                        foreignSlot: nextForeignSlot,
                    };
                }

                remainingPhaseTime.current = ENGLISH_DURATION_MS;
                return {
                    phase: 'english',
                    foreignIndex: nextForeignIndex,
                    foreignSlot: 0,
                    foreignBlockSize: current.foreignBlockSize === 2 ? 3 : 2,
                };
            });
        }, remainingPhaseTime.current);

        return () => {
            window.clearTimeout(timeout);
            if (!phaseCompleted.current) {
                const elapsed = Date.now() - phaseStartedAt.current;
                remainingPhaseTime.current = Math.max(0, remainingPhaseTime.current - elapsed);
            }
        };
    }, [cadence, pageVisible, reducedMotion]);

    const translation = reducedMotion || cadence.phase === 'english'
        ? englishTranslation
        : foreignTranslations[cadence.foreignIndex];

    return (
        <h1 className="home-hero-title text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight text-white">
            <span className="sr-only">Navigating the Intelligence Age</span>
            <span className="hero-title-visual" aria-hidden="true" data-animation={animationVariant}>
                <span className="hero-title-navigation">
                    <span className="hero-title-navigating">Navigating</span>
                    <svg
                        className="hero-title-route"
                        viewBox="0 0 430 34"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path
                            className="hero-title-route-guide"
                            d="M5 24 C72 6, 128 31, 196 17 S318 7, 424 19"
                            pathLength="1"
                        />
                        <path
                            className="hero-title-route-ink"
                            d="M5 24 C44 17, 65 8, 99 12 C134 16, 157 28, 196 17 C238 5, 273 12, 307 11 C345 10, 379 14, 424 19"
                            pathLength="1"
                        />
                        <circle cx="5" cy="24" r="3" />
                        <circle cx="196" cy="17" r="3" />
                        <circle cx="424" cy="19" r="3" />
                        <g className="hero-title-bearing-mark">
                            <path className="hero-title-bearing-rule" d="M6 19 H378" pathLength="1" />
                            <g transform="translate(402 19)">
                                <g className="hero-title-bearing-compass">
                                    <circle r="10" />
                                    <path d="M0 -14 V14 M-14 0 H14" />
                                    <path className="hero-title-bearing-needle" d="M-3 5 L2 -8 L4 -3 L3 7 Z" />
                                </g>
                            </g>
                        </g>
                    </svg>
                    <span className="hero-title-the">the</span>
                </span>
                <span className="hero-title-translation-stage">
                    <bdi
                        key={`${cadence.phase}-${translation.lang}`}
                        className={`hero-title-translation hero-title-script-${translation.script}`}
                        lang={translation.lang}
                        dir={translation.dir}
                        style={{ '--hero-language-color': translation.color } as React.CSSProperties}
                    >
                        {translation.text}
                    </bdi>
                    <svg
                        className="hero-title-signal"
                        viewBox="0 0 640 20"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path className="hero-title-horizon" d="M2 10 H638" pathLength="1" />
                        <path className="hero-title-pulse" d="M390 10 C414 10 418 4 442 4 S474 16 500 16 S530 10 554 10" />
                        <circle cx="554" cy="10" r="2.5" />
                    </svg>
                </span>
            </span>
        </h1>
    );
};

export default HeroTitle;

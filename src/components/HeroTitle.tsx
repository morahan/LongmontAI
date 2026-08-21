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
                        className="hero-title-map-mark"
                        viewBox="0 0 320 14"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path
                            d="M3 9C54 8 76 4 116 5.5C157 7 181 10 221 7C255 4.5 281 5.5 317 6"
                            pathLength="1"
                        />
                        <circle cx="317" cy="6" r="1.7" />
                    </svg>
                    <svg
                        className="hero-title-bearing-mark"
                        viewBox="0 0 220 14"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M4 8H187L193 4.5V11.5L199 8H216" pathLength="1" />
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
                        className="hero-title-signal-mark"
                        viewBox="0 0 320 16"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <defs>
                            <linearGradient id="hero-signal-wave" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="#A7F3D0" />
                                <stop offset="1" stopColor="#A5B4FC" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M4 9C48 9 58 5.5 94 6.5C128 7.5 139 11 175 9.5C211 8 236 4.5 268 6.5C287 7.7 300 8 316 7.5"
                            pathLength="1"
                        />
                    </svg>
                </span>
            </span>
        </h1>
    );
};

export default HeroTitle;

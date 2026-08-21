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
    const [animationVariant] = React.useState<AnimationVariant>(() =>
        animationVariants[Math.floor(Math.random() * animationVariants.length)]
    );
    const [cadence, setCadence] = React.useState<CadenceState>(initialCadence);
    const [reducedMotion, setReducedMotion] = React.useState(reducedMotionIsPreferred);
    const [pageVisible, setPageVisible] = React.useState(
        () => typeof document === 'undefined' || document.visibilityState === 'visible'
    );
    const animationStartRecorded = React.useRef(false);
    const remainingPhaseTime = React.useRef(ENGLISH_DURATION_MS);
    const phaseStartedAt = React.useRef(0);
    const phaseCompleted = React.useRef(false);


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
            <span
                className="hero-title-visual"
                aria-hidden="true"
                data-animation={animationVariant}
                onAnimationStart={() => {
                    if (animationStartRecorded.current) return;
                    animationStartRecorded.current = true;
                    performance.mark('longmont-hero-text-animation-start');
                }}
            >
                <span className="hero-title-navigation">
                    <span className="hero-title-navigating">Navigating</span>
                    <svg
                        className="hero-title-map-symbol"
                        viewBox="0 0 28 28"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <circle className="hero-title-map-start" cx="5" cy="21" r="1.5" />
                        <path d="M7.5 20C10.5 20 11 15.5 14 15.5S17.5 11 20.5 11" pathLength="1" />
                        <circle className="hero-title-map-destination" cx="23" cy="8" r="3" />
                    </svg>
                    <svg
                        className="hero-title-bearing-symbol"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path className="hero-title-bearing-north" d="M12 1V5" />
                        <path className="hero-title-bearing-diamond" d="M12 5L17 12L12 20L7 12Z" />
                    </svg>
                    <svg
                        className="hero-title-signal-symbol"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <circle cx="5" cy="12" r="1.5" />
                        <path d="M8.5 8.5C10.4 10.4 10.4 13.6 8.5 15.5" pathLength="1" />
                        <path d="M12 5.5C15.6 9.1 15.6 14.9 12 18.5" pathLength="1" />
                        <path d="M15.5 3C20.5 8 20.5 16 15.5 21" pathLength="1" />
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
                </span>
            </span>
        </h1>
    );
};

export default HeroTitle;

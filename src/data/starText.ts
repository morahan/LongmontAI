import { modelCatalog } from './modelCatalog.generated.ts';
export const STAR_TEXT_EDITION = {
    id: `models-${modelCatalog.asOf}`,
    generatedAsOf: modelCatalog.asOf,
    window: { startsOn: new Date(Date.parse(`${modelCatalog.asOf}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10), endsOn: modelCatalog.asOf },
    reviewedOn: modelCatalog.entries.filter((entry) => entry.weightUnits > 0).map((entry) => entry.reviewedAt).sort()[0],
} as const;
export const STAR_TEXT_BRAND_PHRASE = 'Longmont.AI' as const;
export const STAR_TEXT_SECOND_BRAND_PHRASE = '1023.Digital' as const;
export const STAR_TEXT_ALTERNATIVES = modelCatalog.entries.filter((entry) => entry.weightUnits > 0).map((entry) => ({ phrase: entry.phrase, topic: entry.category, primarySourceUrl: entry.sourceUrl, weightUnits: entry.weightUnits }));
export const STAR_TEXT_EXCLUDED_CANDIDATES = modelCatalog.entries.filter((entry) => entry.weightUnits === 0).map((entry) => ({ phrase: entry.phrase, reason: entry.eligibility }));
export type StarTextPhrase = string;

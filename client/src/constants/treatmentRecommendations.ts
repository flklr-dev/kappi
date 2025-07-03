export type CoffeeVariety = 'arabica' | 'robusta';

export interface TreatmentRecommendation {
  chemical: string[];
  cultural: string[];
  sources: string[];
}

export interface DiseaseTreatmentData {
  [stage: string]: {
    [variety in CoffeeVariety]: TreatmentRecommendation;
  };
}

export interface TreatmentRecommendations {
  [disease: string]: DiseaseTreatmentData;
}

export const treatmentRecommendations: TreatmentRecommendations = {
  'Coffee Leaf Rust': {
    Early: {
      arabica: {
        chemical: [
          'Preventative copper fungicide (e.g. Bordeaux mixture) at inoculum <10%; apply at leaf emergence',
        ],
        cultural: [
          'Prune lower branches to improve air flow',
          'Maintain proper shade (30–40%) to reduce humidity',
        ],
        sources: [
          'cardi.org',
          'researchgate.net',
        ],
      },
      robusta: {
        chemical: [
          'Single preventive spray of cupric fungicide (e.g. copper oxychloride) at early spore appearance',
        ],
        cultural: [
          'Thinning shade trees',
          'Remove diseased leaves immediately',
        ],
        sources: [
          'ctahr.hawaii.edu',
        ],
      },
    },
    Progressive: {
      arabica: {
        chemical: [
          'Systemic triazole fungicide (triadimefon, Bayleton©) at recommended label rate, repeat in 14 days',
        ],
        cultural: [
          'Moderate pruning to open canopy',
          'Enhance nitrogen-potassium nutrition to boost leaf resistance',
        ],
        sources: [
          'cardi.org',
          'en.wikipedia.org',
        ],
      },
      robusta: {
        chemical: [
          'Follow up with systemic fungicide (e.g. propiconazole) for remedial action',
        ],
        cultural: [
          'Increase inter-row spacing to 2–3 m',
          'Avoid overhead irrigation',
        ],
        sources: [
          'en.wikipedia.org',
        ],
      },
    },
    Severe: {
      arabica: {
        chemical: [
          'Alternate fungicide classes (strobilurins + triazoles) every spray to prevent resistance',
        ],
        cultural: [
          'Sanitation—remove and burn heavily infected branches',
          'Fallow small plots if infection >40% of canopy',
        ],
        sources: [
          'researchgate.net',
        ],
      },
      robusta: {
        chemical: [
          'High-dose systemic sprays every 10 days during wet season',
        ],
        cultural: [
          'Consider replanting with rust-resistant cultivars (e.g. SL28, N39) in long-term rotations',
        ],
        sources: [
          'hawaiicoffeeed.com',
        ],
      },
    },
  },
}; 
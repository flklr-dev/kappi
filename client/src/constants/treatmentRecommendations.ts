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
  'Leaf Rust': {
    Default: {
      arabica: {
        chemical: [
          'Apply copper fungicide during wet season',
          'Use systemic triazole for active infections',
        ],
        cultural: [
          'Prune regularly for air circulation',
          'Remove and destroy infected leaves',
          'Maintain shade at 30-40%',
          'Apply balanced fertilization',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
      robusta: {
        chemical: [
          'Apply copper fungicide preventatively',
          'Use systemic fungicides when needed',
        ],
        cultural: [
          'Thin shade trees to reduce humidity',
          'Remove infected leaves promptly',
          'Maintain proper row spacing',
          'Apply balanced fertilization',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
    },
    Early: {
      arabica: {
        chemical: [
          'Apply copper fungicide at leaf emergence',
        ],
        cultural: [
          'Prune lower branches for airflow',
          'Maintain shade at 30-40%',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
      robusta: {
        chemical: [
          'Single copper spray at early spore stage',
        ],
        cultural: [
          'Thin shade trees',
          'Remove diseased leaves immediately',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
    },
    Progressive: {
      arabica: {
        chemical: [
          'Apply systemic triazole, repeat in 14 days',
        ],
        cultural: [
          'Moderate pruning to open canopy',
          'Boost nitrogen-potassium nutrition',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
      robusta: {
        chemical: [
          'Apply systemic fungicide for control',
        ],
        cultural: [
          'Increase row spacing to 2-3m',
          'Avoid overhead irrigation',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
    },
    Severe: {
      arabica: {
        chemical: [
          'Alternate fungicide classes to prevent resistance',
        ],
        cultural: [
          'Remove and burn infected branches',
          'Fallow plots if >40% infected',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
      robusta: {
        chemical: [
          'High-dose sprays every 10 days in wet season',
        ],
        cultural: [
          'Consider replanting with resistant cultivars',
        ],
        sources: ['Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control'],
      },
    },
    Healthy: {
      arabica: {
        chemical: [],
        cultural: [
          'Prune regularly for airflow',
          'Monitor after rains for early signs',
          'Mulch lightly around base',
        ],
        sources: [],
      },
      robusta: {
        chemical: [],
        cultural: [
          'Thin shade trees regularly',
          'Keep rows clear of debris',
          'Rotate N-P-K fertilization every 2 months',
        ],
        sources: [],
      },
    },
  },
  'Leaf Spot': {
    Default: {
      arabica: {
        chemical: [
          'Apply copper fungicide every 2-3 weeks',
          'Use mancozeb during wet periods',
        ],
        cultural: [
          'Remove infected leaves promptly',
          'Prune for better air circulation',
          'Avoid overhead irrigation',
          'Maintain balanced fertilization',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica', 'Granados - Leaf litter and Mycena citricolor inoculum on the American leaf spot of coffee'],
      },
      robusta: {
        chemical: [
          'Apply copper fungicide every 3-4 weeks',
          'Use protective fungicides in rainy season',
        ],
        cultural: [
          'Remove diseased foliage regularly',
          'Maintain proper plant spacing',
          'Mulch to prevent soil splash',
          'Ensure adequate potassium nutrition',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica'],
      },
    },
    Early: {
      arabica: {
        chemical: [
          'Apply copper protectant at first symptoms',
        ],
        cultural: [
          'Remove spotted leaves immediately',
          'Light pruning for airflow',
          'Reduce shade to 30-35%',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica', 'Granados - Leaf litter and Mycena citricolor inoculum on the American leaf spot of coffee'],
      },
      robusta: {
        chemical: [
          'Apply copper protectant if symptoms appear',
        ],
        cultural: [
          'Remove spotted leaves immediately',
          'Improve ventilation',
          'Enhance drainage',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica'],
      },
    },
    Progressive: {
      arabica: {
        chemical: [
          'Repeat protectant sprays every 2 weeks',
          'Add Trichoderma biocontrol',
        ],
        cultural: [
          'Intensive sanitation of infected material',
          'Reduce shade and humidity levels',
          'Improve nutrition management',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica', 'Granados - Leaf litter and Mycena citricolor inoculum on the American leaf spot of coffee'],
      },
      robusta: {
        chemical: [
          'Repeat protectant sprays + Trichoderma',
        ],
        cultural: [
          'Intensive sanitation practices',
          'Improve drainage and nutrition',
          'Reduce excess moisture',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica'],
      },
    },
    Severe: {
      arabica: {
        chemical: [
          'Intensive spray schedule + biologicals',
        ],
        cultural: [
          'Prune heavily infected branches',
          'Deep cleanup of leaf litter',
          'Consider stumping if >50% affected',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica', 'Granados - Leaf litter and Mycena citricolor inoculum on the American leaf spot of coffee'],
      },
      robusta: {
        chemical: [
          'Intensive spray program',
        ],
        cultural: [
          'Drastic pruning or stumping if needed',
          'Strict sanitation of all debris',
          'Remove all fallen leaves',
        ],
        sources: ['Avelino - Topography and Crop Management Are Key Factors for the Development of American Leaf Spot Epidemics on Coffee in Costa Rica'],
      },
    },
    Healthy: {
      arabica: {
        chemical: [],
        cultural: [
          'Remove old and fallen leaves regularly',
          'Maintain proper plant spacing',
          'Monitor during humid periods',
          'Apply balanced fertilization',
        ],
        sources: [],
      },
      robusta: {
        chemical: [],
        cultural: [
          'Prune to maintain open canopy',
          'Keep plantation floor clean',
          'Monitor after rainfall',
          'Maintain optimal nutrition',
        ],
        sources: [],
      },
    },
  },
  'Brown Spot': {
    Default: {
      arabica: {
        chemical: [
          'Apply copper or mancozeb during wet season',
          'Use protectant fungicides preventatively',
        ],
        cultural: [
          'Remove infected leaves and berries',
          'Prune for better air circulation',
          'Ensure micronutrient nutrition',
          'Control moisture levels',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
      robusta: {
        chemical: [
          'Apply copper fungicide every 3 weeks',
          'Use protective fungicides in high humidity',
        ],
        cultural: [
          'Remove infected material regularly',
          'Maintain proper plant spacing',
          'Optimize shade at 40-50%',
          'Apply micronutrient fertilization',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
    },
    Early: {
      arabica: {
        chemical: [
          'Apply copper hydroxide at first symptoms',
        ],
        cultural: [
          'Remove affected leaves immediately',
          'Improve drainage',
          'Adjust shade for optimal microclimate',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
      robusta: {
        chemical: [
          'Apply copper at early spot appearance',
        ],
        cultural: [
          'Remove symptomatic leaves promptly',
          'Enhance soil drainage',
          'Adjust irrigation practices',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
    },
    Progressive: {
      arabica: {
        chemical: [
          'Apply systemic fungicide every 2-3 weeks',
          'Rotate with contact fungicides',
        ],
        cultural: [
          'Intensive sanitation of berries and leaves',
          'Correct zinc and manganese deficiency',
          'Reduce plant density if overcrowded',
        ],
        sources: ['ResearchGate', 'World Coffee Research'],
      },
      robusta: {
        chemical: [
          'Apply systemic fungicide every 14 days',
        ],
        cultural: [
          'Enhanced sanitation measures',
          'Apply foliar micronutrients',
          'Improve overall plant health',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
    },
    Severe: {
      arabica: {
        chemical: [
          'Rotate fungicides weekly',
        ],
        cultural: [
          'Severe pruning of diseased tissue',
          'Destroy all infected berries',
          'Implement complete IPM strategy',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
      robusta: {
        chemical: [
          'Intensive spray schedule every 7-10 days',
        ],
        cultural: [
          'Drastic pruning or stumping if needed',
          'Remove all diseased material',
          'Apply soil amendments',
        ],
        sources: ['CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'],
      },
    },
    Healthy: {
      arabica: {
        chemical: [],
        cultural: [
          'Maintain micronutrient nutrition',
          'Monitor for early symptoms',
          'Ensure good drainage',
          'Remove fallen leaves and berries',
        ],
        sources: [],
      },
      robusta: {
        chemical: [],
        cultural: [
          'Apply complete fertilizer program',
          'Monitor after wet periods',
          'Maintain optimal shade',
          'Clean plantation floor regularly',
        ],
        sources: [],
      },
    },
  },
  'Sooty Mold': {
    Default: {
      arabica: {
        chemical: [
          'Control insects with insecticides',
          'Apply horticultural oils or soaps',
        ],
        cultural: [
          'Control honeydew-producing insects',
          'Prune for air circulation',
          'Wash off mold with water sprays',
          'Maintain overall plant health',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
      robusta: {
        chemical: [
          'Use selective insecticides',
          'Apply horticultural oil sprays',
        ],
        cultural: [
          'Control sap-sucking insects',
          'Improve canopy ventilation',
          'Remove heavily molded leaves',
          'Encourage natural predators',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
    },
    Early: {
      arabica: {
        chemical: [
          'Apply insecticidal soap or neem oil',
        ],
        cultural: [
          'Remove insect colonies',
          'Control ant populations',
          'Prune for light penetration',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
      robusta: {
        chemical: [
          'Apply insecticidal soap',
        ],
        cultural: [
          'Hand-remove visible pests',
          'Control ant populations',
          'Wash affected leaves',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
    },
    Progressive: {
      arabica: {
        chemical: [
          'Apply systemic insecticides',
          'Horticultural oil every 2-3 weeks',
        ],
        cultural: [
          'Comprehensive pest management',
          'Prune heavily affected branches',
          'Improve overall sanitation',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
      robusta: {
        chemical: [
          'Target pests with effective insecticides',
        ],
        cultural: [
          'Intensive pest monitoring',
          'Prune mold-covered areas',
          'Use ant baiting',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
    },
    Severe: {
      arabica: {
        chemical: [
          'Rotate insecticide classes',
          'Frequent oil applications',
        ],
        cultural: [
          'Severe pruning of affected tissue',
          'Complete pest management overhaul',
          'Consider biological controls',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
      robusta: {
        chemical: [
          'Intensive insecticide program',
          'Weekly oil treatments',
        ],
        cultural: [
          'Drastic pruning for plant health',
          'Complete sanitation',
          'Implement integrated pest management',
        ],
        sources: ['hawaiicoffeeed - Mealybug and Sooty Mold'],
      },
    },
    Healthy: {
      arabica: {
        chemical: [],
        cultural: [
          'Monitor for sap-sucking insects',
          'Encourage beneficial insects',
          'Prune for air circulation',
          'Control ant populations',
        ],
        sources: [],
      },
      robusta: {
        chemical: [],
        cultural: [
          'Scout regularly for pests',
          'Foster natural predators',
          'Keep canopy open',
          'Implement ant management',
        ],
        sources: [],
      },
    },
  },
};
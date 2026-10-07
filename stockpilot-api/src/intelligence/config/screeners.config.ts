export type ScreenerConfig = {
  minimumScore: number;
  minimumCoverage: number;
  resultLimit: number;
};

export const screenerConfig: Record<string, ScreenerConfig> = {
  'financially-strong': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'strong-balance-sheet': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'high-quality': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'high-growth': {
    minimumScore: 70,
    minimumCoverage: 75,
    resultLimit: 300,
  },

  undervalued: {
    minimumScore: 70,
    minimumCoverage: 65,
    resultLimit: 300,
  },

  'strong-momentum': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'estimates-rising': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  /*
   * Interesting setups
   */

  'quality-near-lows': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'quality-near-highs': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 300,
  },

  'growth-near-lows': {
    minimumScore: 70,
    minimumCoverage: 75,
    resultLimit: 300,
  },

  'oversold-quality': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'undervalued-momentum': {
    minimumScore: 70,
    minimumCoverage: 65,
    resultLimit: 150,
  },

  /*
   * Small companies
   */

  'small-cap-quality': {
    minimumScore: 70,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'small-cap-growth': {
    minimumScore: 70,
    minimumCoverage: 75,
    resultLimit: 150,
  },

  'low-cap-ai': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'low-cap-ai-growth': {
    minimumScore: 70,
    minimumCoverage: 75,
    resultLimit: 150,
  },

  /*
   * Themes
   */

  'theme-ai': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'theme-semiconductors': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'theme-data-centers': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'theme-energy': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'theme-cybersecurity': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },

  'theme-robotics': {
    minimumScore: 100,
    minimumCoverage: 80,
    resultLimit: 150,
  },
};

import type {ListSection} from '../types/SmartList';

export const listSections: ListSection[] = [
  {
    id: 'opportunities',
    title: 'Opportunities',
    algorithms: [
      {
        id: 'high-quality',
        title: 'High Quality',
        description: 'Companies with strong business quality and fundamentals.',
      },
      {
        id: 'high-growth',
        title: 'High Growth',
        description: 'Companies showing strong financial growth.',
      },
      {
        id: 'undervalued',
        title: 'Undervalued',
        description: 'Companies trading at attractive valuations.',
      },
      {
        id: 'strong-balance-sheet',
        title: 'Strong Balance Sheets',
        description: 'Companies with strong financial health.',
      },
    ],
  },
  {
    id: 'interesting-setups',
    title: 'Interesting Setups',
    algorithms: [
      {
        id: 'quality-near-lows',
        title: 'Quality Near Lows',
        description: 'High-quality companies trading near their 52-week lows.',
      },
      {
        id: 'quality-near-highs',
        title: 'Quality Near Highs',
        description: 'High-quality companies trading near their 52-week highs.',
      },
      {
        id: 'growth-near-lows',
        title: 'Growth Near Lows',
        description: 'High-growth companies trading near their 52-week lows.',
      },
      {
        id: 'oversold-quality',
        title: 'Oversold Quality',
        description: 'Quality companies showing oversold price conditions.',
      },
      {
        id: 'undervalued-momentum',
        title: 'Undervalued Momentum',
        description: 'Attractive valuations combined with strong price momentum.',
      },
    ],
  },
  {
    id: 'small-companies',
    title: 'Small Companies',
    algorithms: [
      {
        id: 'small-cap-quality',
        title: 'Small-Cap Quality',
        description: 'Smaller companies with strong business quality.',
      },
      {
        id: 'small-cap-growth',
        title: 'Small-Cap Growth',
        description: 'Smaller companies showing strong financial growth.',
      },
      {
        id: 'low-cap-ai',
        title: 'Low-Cap AI',
        description: 'Smaller companies exposed to artificial intelligence.',
      },
      {
        id: 'low-cap-ai-growth',
        title: 'Low-Cap AI Growth',
        description: 'Smaller AI companies with strong financial growth.',
      },
    ],
  },
  {
    id: 'themes',
    title: 'Themes',
    algorithms: [
      {
        id: 'theme-ai',
        title: 'AI',
        description: 'Companies exposed to artificial intelligence.',
      },
      {
        id: 'theme-semiconductors',
        title: 'Semiconductors',
        description: 'Companies in the semiconductor ecosystem.',
      },
      {
        id: 'theme-data-centers',
        title: 'Data Centers',
        description: 'Companies exposed to data-center infrastructure.',
      },
      {
        id: 'theme-energy',
        title: 'Energy',
        description: 'Companies operating across the energy ecosystem.',
      },
      {
        id: 'theme-cybersecurity',
        title: 'Cybersecurity',
        description: 'Companies focused on cybersecurity.',
      },
      {
        id: 'theme-robotics',
        title: 'Robotics',
        description: 'Companies exposed to robotics and automation.',
      },
    ],
  },
];

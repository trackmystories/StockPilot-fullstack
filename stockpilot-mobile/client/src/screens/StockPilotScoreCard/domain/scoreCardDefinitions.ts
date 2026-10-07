export type ScoreLanguage = 'en' | 'es';

type LocalizedScoreDefinition = {
  en: {
    title: string;
    subtitle: string;
    whatWeLookFor: string;
  };

  es: {
    title: string;
    subtitle: string;
    whatWeLookFor: string;
  };
};

export const scoreCardDefinitions: Record<string, LocalizedScoreDefinition> = {
  overall: {
    en: {
      title: 'Overall',
      subtitle: 'Combined assessment',
      whatWeLookFor:
        'Quality, growth, financial strength, valuation and momentum. Available evidence determines coverage.',
    },
    es: {
      title: 'General',
      subtitle: 'Evaluación combinada',
      whatWeLookFor:
        'Calidad, crecimiento, solidez financiera, valoración e impulso. La evidencia disponible determina la cobertura.',
    },
  },
  risk: {
    en: {
      title: 'Risk',
      subtitle: 'Overall investment risk',
      whatWeLookFor: 'Debt, profitability, valuation and volatility.',
    },

    es: {
      title: 'Riesgo',
      subtitle: 'Riesgo general de inversiÃ³n',
      whatWeLookFor: 'Deuda, rentabilidad, valoraciÃ³n y volatilidad.',
    },
  },

  volatility: {
    en: {
      title: 'Volatility',
      subtitle: 'Price movement',
      whatWeLookFor: 'Beta and historical price movement.',
    },

    es: {
      title: 'Volatilidad',
      subtitle: 'Movimiento del precio',
      whatWeLookFor: 'Beta y movimiento histÃ³rico del precio.',
    },
  },

  quality: {
    en: {
      title: 'Quality',
      subtitle: 'Business fundamentals',
      whatWeLookFor: 'ROIC, margins and cash conversion.',
    },

    es: {
      title: 'Calidad',
      subtitle: 'Fundamentales del negocio',
      whatWeLookFor: 'ROIC, mÃ¡rgenes y conversiÃ³n de caja.',
    },
  },

  growth: {
    en: {
      title: 'Growth',
      subtitle: 'Expansion strength',
      whatWeLookFor: 'Revenue, cash flow and margins.',
    },

    es: {
      title: 'Crecimiento',
      subtitle: 'Fortaleza de expansiÃ³n',
      whatWeLookFor: 'Ingresos, flujo de caja y mÃ¡rgenes.',
    },
  },

  financialHealth: {
    en: {
      title: 'Financial Health',
      subtitle: 'Balance sheet strength',
      whatWeLookFor: 'Debt, liquidity and interest coverage.',
    },

    es: {
      title: 'Salud Financiera',
      subtitle: 'Fortaleza del balance',
      whatWeLookFor: 'Deuda, liquidez y cobertura de intereses.',
    },
  },

  conviction: {
    en: {
      title: 'Conviction',
      subtitle: 'Overall signal strength',
      whatWeLookFor: 'Quality, growth, value and resilience.',
    },

    es: {
      title: 'ConvicciÃ³n',
      subtitle: 'Fortaleza general de seÃ±ales',
      whatWeLookFor: 'Calidad, crecimiento, valor y resistencia.',
    },
  },

  valuation: {
    en: {
      title: 'Valuation',
      subtitle: 'Valuation attractiveness',
      whatWeLookFor: 'P/E, sales multiples and cash yield.',
    },

    es: {
      title: 'ValoraciÃ³n',
      subtitle: 'Atractivo de valoraciÃ³n',
      whatWeLookFor: 'PER, mÃºltiplos de ventas y rentabilidad de caja.',
    },
  },

  momentum: {
    en: {
      title: 'Momentum',
      subtitle: 'Market trend strength',
      whatWeLookFor: 'Price trends and recent returns.',
    },

    es: {
      title: 'Momentum',
      subtitle: 'Fortaleza de tendencia',
      whatWeLookFor: 'Tendencias de precio y rentabilidad reciente.',
    },
  },

  earningsQuality: {
    en: {
      title: 'Earnings Quality',
      subtitle: 'Cash-backed earnings',
      whatWeLookFor: 'Cash conversion, accruals and FCF.',
    },

    es: {
      title: 'Calidad de Beneficios',
      subtitle: 'Beneficios respaldados por caja',
      whatWeLookFor: 'ConversiÃ³n de caja, devengos y FCF.',
    },
  },

  capitalEfficiency: {
    en: {
      title: 'Capital Efficiency',
      subtitle: 'Returns on capital',
      whatWeLookFor: 'ROIC and capital productivity.',
    },

    es: {
      title: 'Eficiencia de Capital',
      subtitle: 'Retorno sobre capital',
      whatWeLookFor: 'ROIC y productividad del capital.',
    },
  },

  reratingPotential: {
    en: {
      title: 'Rerating Potential',
      subtitle: 'Potential multiple expansion',
      whatWeLookFor: 'Improving fundamentals before repricing.',
    },

    es: {
      title: 'Potencial de RevaloraciÃ³n',
      subtitle: 'ExpansiÃ³n potencial del mÃºltiplo',
      whatWeLookFor: 'Fundamentales mejorando antes de revalorizarse.',
    },
  },

  execution: {
    en: {
      title: 'Execution',
      subtitle: 'Management delivery',
      whatWeLookFor: 'Growth, margins and cash progress.',
    },

    es: {
      title: 'EjecuciÃ³n',
      subtitle: 'Cumplimiento de la direcciÃ³n',
      whatWeLookFor: 'Crecimiento, mÃ¡rgenes y progreso de caja.',
    },
  },

  cashPower: {
    en: {
      title: 'Cash Power',
      subtitle: 'Cash generation strength',
      whatWeLookFor: 'FCF growth, margins and conversion.',
    },

    es: {
      title: 'Potencia de Caja',
      subtitle: 'Fortaleza de generaciÃ³n de caja',
      whatWeLookFor: 'Crecimiento FCF, mÃ¡rgenes y conversiÃ³n.',
    },
  },

  fundingPressure: {
    en: {
      title: 'Funding Pressure',
      subtitle: 'External funding pressure',
      whatWeLookFor: 'Historical cash spending, debt growth and financing pressure.',
    },

    es: {
      title: 'PresiÃ³n de FinanciaciÃ³n',
      subtitle: 'Necesidad de financiaciÃ³n externa',
      whatWeLookFor: 'AutonomÃ­a, deuda y necesidades financieras.',
    },
  },

  dilutionRisk: {
    en: {
      title: 'Dilution Risk',
      subtitle: 'Future dilution exposure',
      whatWeLookFor: 'Share growth and stock issuance.',
    },

    es: {
      title: 'Riesgo de DiluciÃ³n',
      subtitle: 'ExposiciÃ³n futura a diluciÃ³n',
      whatWeLookFor: 'Crecimiento de acciones y emisiones.',
    },
  },

  balanceSheetResilience: {
    en: {
      title: 'Balance Resilience',
      subtitle: 'Downturn resilience',
      whatWeLookFor: 'Cash, debt and liquidity strength.',
    },

    es: {
      title: 'Resistencia del Balance',
      subtitle: 'Resistencia ante caÃ­das',
      whatWeLookFor: 'Caja, deuda y fortaleza de liquidez.',
    },
  },

  growthDurability: {
    en: {
      title: 'Growth Durability',
      subtitle: 'Sustainable expansion',
      whatWeLookFor: 'Growth supported by cash and margins.',
    },

    es: {
      title: 'Durabilidad del Crecimiento',
      subtitle: 'ExpansiÃ³n sostenible',
      whatWeLookFor: 'Crecimiento respaldado por caja y mÃ¡rgenes.',
    },
  },

  marginPower: {
    en: {
      title: 'Margin Power',
      subtitle: 'Profit margin strength',
      whatWeLookFor: 'Margin levels and improvement.',
    },

    es: {
      title: 'Fortaleza de MÃ¡rgenes',
      subtitle: 'Fortaleza de rentabilidad',
      whatWeLookFor: 'Niveles de margen y mejora.',
    },
  },

  capitalDiscipline: {
    en: {
      title: 'Capital Discipline',
      subtitle: 'Capital allocation quality',
      whatWeLookFor: 'ROIC, capex, debt and issuance.',
    },

    es: {
      title: 'Disciplina de Capital',
      subtitle: 'Calidad de asignaciÃ³n de capital',
      whatWeLookFor: 'ROIC, capex, deuda y emisiones.',
    },
  },

  earningsReliability: {
    en: {
      title: 'Earnings Reliability',
      subtitle: 'Earnings dependability',
      whatWeLookFor: 'Cash backing and margin consistency.',
    },

    es: {
      title: 'Fiabilidad de Beneficios',
      subtitle: 'Consistencia de beneficios',
      whatWeLookFor: 'Respaldo de caja y mÃ¡rgenes consistentes.',
    },
  },

  businessEfficiency: {
    en: {
      title: 'Business Efficiency',
      subtitle: 'Efficient capital use',
      whatWeLookFor: 'Revenue generated from invested capital.',
    },

    es: {
      title: 'Eficiencia del Negocio',
      subtitle: 'Uso eficiente del capital',
      whatWeLookFor: 'Ingresos generados por capital invertido.',
    },
  },

  valuationCompressionRisk: {
    en: {
      title: 'Compression Risk',
      subtitle: 'Multiple compression exposure',
      whatWeLookFor: 'High valuation with slowing fundamentals.',
    },

    es: {
      title: 'Riesgo de CompresiÃ³n',
      subtitle: 'ExposiciÃ³n a compresiÃ³n de mÃºltiplos',
      whatWeLookFor: 'ValoraciÃ³n alta con fundamentales desacelerando.',
    },
  },

  recovery: {
    en: {
      title: 'Recovery',
      subtitle: 'Fundamental recovery strength',
      whatWeLookFor: 'Improving fundamentals after weakness.',
    },

    es: {
      title: 'RecuperaciÃ³n',
      subtitle: 'Fortaleza de recuperaciÃ³n fundamental',
      whatWeLookFor: 'Fundamentales mejorando tras debilidad.',
    },
  },

  breakoutReadiness: {
    en: {
      title: 'Breakout Readiness',
      subtitle: 'Breakout setup strength',
      whatWeLookFor: 'Momentum, growth and improving margins.',
    },

    es: {
      title: 'PreparaciÃ³n para Ruptura',
      subtitle: 'Fortaleza de configuraciÃ³n',
      whatWeLookFor: 'Momentum, crecimiento y mÃ¡rgenes mejorando.',
    },
  },

  fundamentalMomentum: {
    en: {
      title: 'Fundamental Momentum',
      subtitle: 'Business acceleration',
      whatWeLookFor: 'Revenue, EPS, margins and FCF.',
    },

    es: {
      title: 'Momentum Fundamental',
      subtitle: 'AceleraciÃ³n del negocio',
      whatWeLookFor: 'Ingresos, BPA, mÃ¡rgenes y FCF.',
    },
  },

  survival: {
    en: {
      title: 'Funding Resilience',
      subtitle: 'Liquidity and funding assessment',
      whatWeLookFor:
        'Cash generation, liquidity and financing pressure. Not a bankruptcy prediction.',
    },

    es: {
      title: 'Resiliencia Financiera',
      subtitle: 'Liquidez y financiaciÃ³n',
      whatWeLookFor: 'GeneraciÃ³n de caja, liquidez y financiaciÃ³n. No predice quiebras.',
    },
  },

  shareholderFriendliness: {
    en: {
      title: 'Shareholder Friendly',
      subtitle: 'Shareholder alignment',
      whatWeLookFor: 'Dilution, buybacks and capital discipline.',
    },

    es: {
      title: 'Amigable con Accionistas',
      subtitle: 'AlineaciÃ³n con accionistas',
      whatWeLookFor: 'DiluciÃ³n, recompras y disciplina de capital.',
    },
  },

  selfFunding: {
    en: {
      title: 'Self Funding',
      subtitle: 'Internal funding capacity',
      whatWeLookFor: 'FCF, capex and external funding.',
    },

    es: {
      title: 'AutofinanciaciÃ³n',
      subtitle: 'Capacidad de financiaciÃ³n interna',
      whatWeLookFor: 'FCF, capex y financiaciÃ³n externa.',
    },
  },

  operatingLeverage: {
    en: {
      title: 'Operating Leverage',
      subtitle: 'Incremental operating profitability',
      whatWeLookFor: 'Operating margin changes and incremental operating profitability.',
    },

    es: {
      title: 'Apalancamiento Operativo',
      subtitle: 'Escalabilidad de beneficios',
      whatWeLookFor: 'Cambios del margen operativo y rentabilidad operativa incremental.',
    },
  },

  dilution: {
    en: {
      title: 'Dilution Protection',
      subtitle: 'Share count discipline',
      whatWeLookFor: 'Inverse of Dilution Risk; not an independent signal.',
    },

    es: {
      title: 'ProtecciÃ³n frente a DiluciÃ³n',
      subtitle: 'Disciplina del nÃºmero de acciones',
      whatWeLookFor: 'Inverso del riesgo de diluciÃ³n; no es una seÃ±al independiente.',
    },
  },
};

export function getScoreCardDefinition(id: string, language: ScoreLanguage) {
  return (
    scoreCardDefinitions[id]?.[language] ?? {
      title: id,
      subtitle: '',
      whatWeLookFor: '',
    }
  );
}

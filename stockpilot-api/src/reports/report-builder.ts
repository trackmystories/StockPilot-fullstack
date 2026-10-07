import {buildReportArticle} from './report-article';
import {selectReportEvidence} from './report-evidence';
import {hash, LAYER_NAMES, type LayerName} from '../sec-research/sec-research.types';
import {
  REPORT_VERSION,
  type CompanyReport,
  type ReportInput,
  type ReportSection,
  type ReportSource,
  type ReportStatement,
} from './report.types';

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(record) : [];
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const string = (value: unknown): string => (typeof value === 'string' ? value : '');
const format = (value: number, digits = 1): string =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const date = (value: unknown): string | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const preparationStatus = (status: string): string =>
  ['prepared', 'unchanged'].includes(status) ? 'available' : status;

export function reportSecRevision(
  metadata: Record<string, unknown> | null,
  status: string,
): string {
  return hash(
    JSON.stringify({
      fingerprint: metadata?.fingerprint ?? null,
      preparedAt: metadata?.preparedAt ?? null,
      extractorVersion: metadata?.extractorVersion ?? null,
      failedFilingCount: metadata?.failedFilingCount ?? null,
      coverage: metadata?.coverage ?? null,
      status: preparationStatus(status),
    }),
  );
}

// Content, not refresh timestamps, determines whether a report needs rebuilding.
export function reportFingerprint(input: ReportInput): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      );
    }
    return value;
  };
  return hash(
    JSON.stringify(
      canonical({
        version: REPORT_VERSION,
        symbol: input.symbol,
        companyName: input.companyName,
        sourceRunId: input.sourceRunId,
        financial: input.financial,
        financialHistory: input.financialHistory ?? null,
        scorecard: input.scorecard,
        sec: {
          fingerprint: input.sec.metadata?.fingerprint ?? null,
          extractorVersion: input.sec.metadata?.extractorVersion ?? null,
          failedFilingCount: input.sec.metadata?.failedFilingCount ?? null,
          selectionMode: input.sec.metadata?.selectionMode ?? null,
          revision: reportSecRevision(input.sec.metadata, input.sec.status),
          layers: input.sec.layers,
        },
      }),
    ),
  );
}

const layerDetails: Record<LayerName, [string, string]> = {
  businessProfile: [
    'Business profile',
    'How the issuer describes its business, products and markets.',
  ],
  operatingKpis: [
    'Operating KPIs',
    'Selected operational disclosures. Targets and capacity plans remain issuer statements.',
  ],
  managementExplanations: [
    'Management explanations',
    'Management’s explanations of performance, explicitly attributed to the issuer.',
  ],
  materialEvents: [
    'Material events',
    'Selected dated disclosures; proposed transactions are not treated as completed.',
  ],
  riskFactors: [
    'Risk factors',
    'Company-specific filing excerpts, complementing the numerical risk scores.',
  ],
  segmentIntelligence: [
    'Segment intelligence',
    'Disclosed business or geographic breakdowns. Periods and units remain as filed.',
  ],
};

export function buildReport(
  input: ReportInput,
  generatedAt = new Date().toISOString(),
): CompanyReport {
  const analysis = record(input.financial?.analysis);
  const financialAsOf = date(input.financial?.calculatedAt);
  const sources = new Map<string, ReportSource>();
  const sections: ReportSection[] = [];
  const gaps: string[] = [];
  const createSection = (id: string, title: string, description: string): ReportSection => {
    const section: ReportSection = {
      id,
      title,
      description,
      statements: [],
      tables: [],
      notes: [],
    };
    sections.push(section);
    return section;
  };
  const calculationSource = (field: string, scorecard = false): string => {
    const path = `screenerRuns/${input.sourceRunId}/${scorecard ? 'scorecards' : 'intelligence'}/${input.symbol}`;
    const id = hash(`${path}:${field}`).slice(0, 20);
    sources.set(id, {
      id,
      kind: 'calculation',
      label: scorecard ? 'StockPilot score' : 'StockPilot financial analysis',
      asOf: scorecard ? date(input.scorecard?.calculatedAt) : financialAsOf,
      url: null,
      documentPath: path,
      fieldPath: field,
      accession: null,
      reportDate: null,
      sha256: null,
    });
    return id;
  };
  const add = (
    section: ReportSection,
    title: string,
    text: string,
    field: string,
    kind: ReportStatement['kind'] = 'calculation',
    scorecard = false,
  ) => {
    const sourceId = calculationSource(field, scorecard);
    section.statements.push({
      id: hash(`${section.id}:${field}:${text}`).slice(0, 20),
      kind,
      title,
      text,
      context: null,
      sourceIds: [sourceId],
    });
  };

  const financials = createSection(
    'financials',
    'Financial performance',
    'Saved financial calculations. TTM means trailing twelve months; growth rates are not forecasts.',
  );
  const metrics = record(analysis.metrics);
  const metricsToShow: [string, string, string, string][] = [
    ['growth', 'revenueGrowthYoY', 'Revenue growth, year over year', '%'],
    ['growth', 'revenueGrowthTtm', 'Revenue growth, TTM', '%'],
    ['profitability', 'operatingMarginTtm', 'Operating margin, TTM', '%'],
    ['cashFlow', 'freeCashFlowMargin', 'Free cash flow margin', '%'],
    ['balanceSheet', 'currentRatio', 'Current ratio', '×'],
    ['balanceSheet', 'interestCoverage', 'Interest coverage', '×'],
    ['balanceSheet', 'netDebtToEbitda', 'Net debt / EBITDA', '×'],
    ['dilution', 'dilutedShareGrowthYoY', 'Diluted share growth, year over year', '%'],
  ];
  for (const [group, key, title, unit] of metricsToShow) {
    const value = number(record(metrics[group])[key]);
    if (value !== null)
      add(
        financials,
        title,
        `${title}: ${format(value)}${unit}.`,
        `analysis.metrics.${group}.${key}`,
      );
  }
  if (!financials.statements.length) {
    financials.notes.push('No usable saved financial metrics are available.');
    gaps.push('Financial metrics unavailable');
  }

  const fairValue = record(analysis.fairValue);
  const currency = string(fairValue.currency);
  const money = (value: number): string =>
    `${currency ? `${currency} ` : ''}${format(value, 2)}`;
  const methods = list(fairValue.methods);
  const usesPeers = methods.some((method) => method.source === 'peer');
  const valuation = createSection(
    'valuation',
    'Fair Value',
    'A saved model reference, not a promised return or a report price objective.',
  );
  const reference = number(fairValue.estimatedFairValue);
  const price = number(fairValue.currentPrice);
  if (fairValue.eligible === true && reference !== null && reference > 0) {
    add(
      valuation,
      'Model reference',
      `The saved model reference is ${money(reference)}${price !== null && price > 0 ? ` versus a snapshot price of ${money(price)}` : ''}. Model confidence: ${string(fairValue.confidence) || 'unavailable'}.`,
      'analysis.fairValue',
    );
    const rows = methods
      .filter((m) => number(m.impliedValue) !== null)
      .map((m) => [
        string(m.name),
        money(m.impliedValue as number),
        string(m.peerGroup) || 'Analyst consensus',
        number(m.peerCount) === null ? '—' : String(m.peerCount),
      ]);
    if (rows.length)
      valuation.tables.push({
        title: 'Saved valuation methods',
        columns: ['Method', 'Reference', 'Group / basis', 'Peers'],
        rows,
        sourceIds: [calculationSource('analysis.fairValue.methods')],
      });
  } else {
    valuation.notes.push(
      'The saved valuation model is not eligible or has insufficient data.',
    );
    gaps.push('Eligible Fair Value unavailable');
  }
  if (!currency)
    valuation.notes.push(
      'Currency was not recorded in the saved model. No currency conversion is assumed.',
    );
  if (usesPeers)
    valuation.notes.push(
      'Peer-based references depend on the provider’s industry classification. Business comparability has not been validated; do not interpret this reference as proof of mispricing.',
    );

  const outlook = record(analysis.earningsOutlook);
  const earnings = createSection(
    'earnings',
    'Earnings Outlook',
    'Saved analyst estimates are forecasts, not reported results.',
  );
  const currentPeriod = string(outlook.currentPeriod);
  const nextPeriod = string(outlook.nextPeriod);
  const forecastRows: string[][] = [];
  for (const [key, label] of [
    ['eps', 'EPS estimate'],
    ['revenue', 'Revenue estimate'],
  ]) {
    const row = record(outlook[key]);
    const current = number(row.currentEstimate);
    const next = number(row.nextEstimate);
    if (current !== null || next !== null) {
      forecastRows.push([
        label,
        current === null ? '—' : format(current, 2),
        next === null ? '—' : format(next, 2),
      ]);
    }
  }
  if (forecastRows.length) {
    earnings.tables.push({
      title: 'Analyst forecasts • values as stored',
      columns: [
        'Measure',
        currentPeriod || 'Period not recorded',
        nextPeriod || 'Period not recorded',
      ],
      rows: forecastRows,
      sourceIds: [calculationSource('analysis.earningsOutlook')],
    });
    const analysts = number(outlook.analystCount);
    if (analysts !== null)
      add(
        earnings,
        'Analyst coverage',
        `The saved forecast has ${format(analysts, 0)} contributing analysts.`,
        'analysis.earningsOutlook.analystCount',
        'forecast',
      );
    earnings.notes.push(
      'Forecast currency is not specified by this saved output; no exchange-rate or share-class conversion is assumed.',
    );
  } else {
    earnings.notes.push('No saved analyst estimates are available.');
    gaps.push('Analyst forecasts unavailable');
  }
  if (outlook.eligible !== true)
    earnings.notes.push(
      'There is not enough evidence for an eligible Earnings Outlook score. Available estimates can still be shown individually.',
    );

  const peers = record(analysis.peerComparison);
  const peerSection = createSection(
    'peers',
    'Peer context',
    'Existing provider-classified peer calculations; this is not a validated competitor ranking.',
  );
  const industry = string(peers.industry);
  if (industry)
    add(
      peerSection,
      'Saved peer industry',
      `The saved peer industry is ${industry}${string(peers.sector) ? ` within ${string(peers.sector)}` : ''}.`,
      'analysis.peerComparison',
    );
  const peerRows = Object.values(record(peers.dimensions))
    .map(record)
    .filter((dimension) => number(dimension.standingPercentile) !== null)
    .map((dimension) => [
      string(dimension.name),
      `${format(dimension.standingPercentile as number)}th`,
      number(dimension.peerCount) === null ? '—' : String(dimension.peerCount),
      string(dimension.confidence) || '—',
    ]);
  if (peerRows.length)
    peerSection.tables.push({
      title: 'Saved percentile comparisons',
      columns: ['Dimension', 'Standing', 'Peer count', 'Confidence'],
      rows: peerRows,
      sourceIds: [calculationSource('analysis.peerComparison.dimensions')],
    });
  peerSection.notes.push(
    'Peer groups may mix different business models and periods. No “only company”, “cheapest” or market-wide leadership claim is made.',
  );
  if (!industry) gaps.push('Peer classification unavailable');

  const scores = record(record(input.scorecard?.data).scores);
  const scoreSection = createSection(
    'scores',
    'StockPilot scores',
    'Saved eligible scores. Direction matters: a higher risk score means higher risk.',
  );
  const scoreRows = Object.entries(scores).flatMap(([key, raw]) => {
    const score = record(raw);
    const value = number(score.score);
    if (score.eligible === false || value === null || value < 0 || value > 10) return [];
    return [
      [
        key.replace(/([A-Z])/g, ' $1').replace(/^./, (first) => first.toUpperCase()),
        `${format(value)}/10`,
        score.direction === 'higher_is_riskier' ? 'Higher = riskier' : 'Higher = better',
        string(score.confidence) || '—',
      ],
    ];
  });
  if (scoreRows.length)
    scoreSection.tables.push({
      title: 'Calculated scores',
      columns: ['Score', 'Value', 'Direction', 'Confidence'],
      rows: scoreRows,
      sourceIds: [calculationSource('data.scores', true)],
    });
  else scoreSection.notes.push('No eligible saved scores are available.');

  const investment = record(analysis.investmentCase);
  const caseSection = createSection(
    'investment-case',
    'Investment Case',
    'Evidence from the saved model, with peer-dependent conclusions withheld until comparability is validated.',
  );
  for (const group of ['strengths', 'watch', 'risks']) {
    for (const item of list(investment[group])) {
      if (
        item.source === 'peer-comparison' ||
        (item.source === 'fair-value' && (usesPeers || fairValue.eligible !== true))
      )
        continue;
      if (item.source === 'earnings-outlook' && outlook.eligible !== true) continue;
      if (item.source === 'scorecard') {
        const scoreKey = string(item.key).replace(/-(high|low)$/, '');
        const score = record(scores[scoreKey]);
        if (score.eligible === false || number(score.score) === null) continue;
      }
      if (
        !['fair-value', 'earnings-outlook', 'scorecard', 'data-quality'].includes(
          string(item.source),
        )
      )
        continue;
      const text = string(item.evidence);
      if (text)
        add(
          caseSection,
          `${group === 'strengths' ? 'Strength' : group === 'risks' ? 'Risk' : 'Watch'} · ${string(item.title)}`,
          text,
          `analysis.investmentCase.${group}`,
        );
    }
  }
  if (!caseSection.statements.length)
    caseSection.notes.push(
      'No supported standalone investment-case signals are available after the evidence checks.',
    );
  if (usesPeers || industry)
    caseSection.notes.push(
      'Peer-dependent investment-case conclusions are not repeated as report conclusions. Existing calculations remain available in Analysis.',
    );

  let secLayers = 0;
  for (const name of LAYER_NAMES) {
    const [title, description] = layerDetails[name];
    const section = createSection(`sec-${name}`, title, description);
    const layer = input.sec.layers[name];
    const chosen = selectReportEvidence(input.sec.layers, name);
    if (chosen.length) secLayers++;
    if (name === 'riskFactors' && chosen.length && !layer?.evidence.length) {
      section.notes.push(
        'Risk disclosures were recovered from excerpts saved under other SEC layers. The original risk layer is empty.',
      );
      gaps.push(
        'The original risk layer was empty; report risk excerpts were recovered from other saved layers',
      );
    }
    for (const item of chosen) {
      const sourceId = hash(`${item.source.url}:${item.source.sha256}`).slice(0, 20);
      sources.set(sourceId, {
        id: sourceId,
        kind: 'sec',
        label: `${item.source.form} · filed ${item.source.filedAt}`,
        asOf: item.source.filedAt,
        url: item.source.url,
        documentPath: item.source.rawPath,
        fieldPath: '',
        accession: item.source.accession,
        reportDate: item.source.reportDate || null,
        sha256: item.source.sha256,
      });
      section.statements.push({
        id: item.id,
        kind: name === 'managementExplanations' ? 'management' : 'issuer',
        title: `${item.source.form} · ${item.source.filedAt} · block ${item.block}`,
        text: item.table || item.quote,
        context: item.context || null,
        sourceIds: [sourceId],
      });
    }
    if (!chosen.length) {
      section.notes.push(
        'No usable evidence is present in the saved research for this section. This does not mean the company has no relevant disclosures.',
      );
      gaps.push(`${title}: saved evidence unavailable`);
    } else {
      section.notes.push(
        'Selected source excerpts, not exhaustive coverage. Statements and targets remain attributed to the issuer and may have been superseded.',
      );
    }
    if ((layer?.omittedEvidenceCount ?? 0) > 0)
      section.notes.push(
        'The upstream extraction reached its evidence limit; some saved source content was not included in the prepared layer.',
      );
  }
  if (
    input.sec.status === 'failed' ||
    input.sec.status === 'partial' ||
    number(input.sec.metadata?.failedFilingCount)
  )
    gaps.push('The latest SEC preparation was incomplete');
  if (input.sec.metadata?.selectionMode === 'focused')
    gaps.push('SEC coverage is focused, not a complete filing history');
  const order = [
    'sec-businessProfile',
    'financials',
    'sec-operatingKpis',
    'sec-managementExplanations',
    'sec-materialEvents',
    'sec-segmentIntelligence',
    'valuation',
    'earnings',
    'peers',
    'investment-case',
    'sec-riskFactors',
    'scores',
  ];
  sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const article = buildReportArticle(input, sections, sources, calculationSource);
  const secDates = [...sources.values()]
    .filter((source) => source.kind === 'sec')
    .map((source) => source.asOf!)
    .sort();
  return {
    article,
    version: REPORT_VERSION,
    symbol: input.symbol,
    companyName: input.companyName,
    sourceRunId: input.sourceRunId,
    fingerprint: reportFingerprint(input),
    generatedAt,
    financialAsOf,
    secAsOf: secDates.at(-1) ?? null,
    secRevision: reportSecRevision(input.sec.metadata, input.sec.status),
    status: gaps.length ? 'limited' : 'available',
    summary: [
      ...financials.statements.slice(0, 3),
      ...caseSection.statements.filter((s) => s.title.startsWith('Risk')).slice(0, 1),
    ],
    sections,
    sources: [...sources.values()],
    coverage: {
      financials: financials.statements.length > 0,
      secLayers,
      totalSecLayers: LAYER_NAMES.length,
      gaps,
    },
    methodology:
      'StockPilot combines saved financial calculations with selected, attributed SEC filing excerpts. Explanations and charts are prepared from saved evidence. Educational explanations are labelled separately from company disclosures. Forecasts, model references and issuer statements are distinct from reported results. Missing evidence is shown explicitly. Peer business comparability has not been independently validated.',
  };
}
import {hash} from '../sec-research/sec-research.types';
import {reportedCharts} from './report-charts';
import type {
  ReportArticle,
  ReportArticleSection,
  ReportInput,
  ReportParagraph,
  ReportSection,
  ReportSource,
} from './report.types';

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const numeric = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const format = (value: number): string =>
  value.toLocaleString('en-US', {maximumFractionDigits: 1});
const money = (value: number): string =>
  value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const validPeriod = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));

const evidenceGuide: Record<string, {title: string; explanation: string}> = {
  'sec-businessProfile': {
    title: 'What the company does',
    explanation:
      'Start with how the company earns money: its products, customers and business activities. The company description below is a disclosed statement, not an independent endorsement.',
  },
  'sec-operatingKpis': {
    title: 'What is happening inside the business',
    explanation:
      'Operating measures explain activity that revenue alone can miss, such as customers, production or capacity. A planned target, a signed agreement and a facility already in operation are different stages of progress.',
  },
  'sec-managementExplanations': {
    title: 'Why management says results changed',
    explanation:
      'These are management’s explanations of the results. Compare them with the financial trends; an explanation for a change does not by itself establish that the change is temporary.',
  },
  'sec-materialEvents': {
    title: 'Developments to follow',
    explanation:
      'Check what has happened, what is still conditional and the date of each disclosure. Announced plans and potential contract values are not the same as completed work or revenue already earned.',
  },
  'sec-segmentIntelligence': {
    title: 'Where the business earns its money',
    explanation:
      'Business and geographic breakdowns help show where results come from. Revenue, profit and assets measure different things; compare the same measure and reporting period.',
  },
  'sec-riskFactors': {
    title: 'What could go wrong',
    explanation:
      'The following risks were disclosed by the company. They describe possible outcomes, not predictions that each outcome will occur.',
  },
};

export function buildReportArticle(
  input: ReportInput,
  evidenceSections: ReportSection[],
  sources: Map<string, ReportSource>,
  calculationSource: (field: string, scorecard?: boolean) => string,
): ReportArticle {
  const analysis = record(input.financial?.analysis);
  const metrics = record(analysis.metrics);
  const sections: ReportArticleSection[] = [];
  const section = (id: string, title: string): ReportArticleSection => {
    const value: ReportArticleSection = {
      id,
      title,
      paragraphs: [],
      charts: [],
      evidenceIds: [],
    };
    sections.push(value);
    return value;
  };
  const paragraph = (
    target: ReportArticleSection,
    value: string,
    kind: ReportParagraph['kind'],
    sourceIds: string[] = [],
  ) =>
    target.paragraphs.push({
      id: hash(`${target.id}:${value}`).slice(0, 20),
      text: value,
      kind,
      sourceIds,
    });
  const calculated = (
    target: ReportArticleSection,
    value: string,
    field: string,
    kind: ReportParagraph['kind'] = 'model',
  ) => paragraph(target, value, kind, [calculationSource(field)]);
  const metric = (group: string, key: string) => numeric(record(metrics[group])[key]);
  const companyEvidence = (id: string) => {
    const original = evidenceSections.find((item) => item.id === id);
    if (!original?.statements.length) return;
    const guide = evidenceGuide[id];
    const target = section(id, guide.title);
    paragraph(target, guide.explanation, 'explanation');
    // Retain the issuer's wording and qualifiers instead of inventing a paraphrase.
    // The complete excerpts remain accessible beneath the reading view.
    const candidates = original.statements.filter((item) => !item.text.includes('|'));
    const selected = candidates.slice(0, id === 'sec-businessProfile' ? 1 : 2);
    for (const item of selected) {
      const source = sources.get(item.sourceIds[0]);
      const date = source?.asOf?.slice(0, 10);
      const attribution =
        id === 'sec-managementExplanations' ? 'Management reported' : 'The company disclosed';
      paragraph(
        target,
        `${attribution}${date ? ` on ${date}` : ''}: “${item.text.trim()}”`,
        'disclosure',
        item.sourceIds,
      );
    }
    target.evidenceIds = [id];
  };
  companyEvidence('sec-businessProfile');
  const financials = section('financials', 'Is the business growing profitably?');
  const growth = metric('growth', 'revenueGrowthYoY');
  const margin = metric('profitability', 'operatingMarginTtm');
  if (growth !== null) {
    calculated(
      financials,
      growth === 0
        ? 'Revenue was unchanged from a year earlier in the saved financial calculation.'
        : `Revenue ${growth > 0 ? 'grew' : 'fell'} ${format(Math.abs(growth))}% compared with a year earlier. This describes sales growth, not the change in profit.`,
      'analysis.metrics.growth.revenueGrowthYoY',
    );
  }
  if (margin !== null) {
    calculated(
      financials,
      `Over the trailing twelve months, the operating margin was ${format(margin)}%. ${margin < 0 ? `That represents an operating loss of about ${format(Math.abs(margin))} for every 100 of revenue, before financing costs and tax.` : margin === 0 ? 'Operating income was approximately zero relative to revenue.' : `The business retained about ${format(margin)} in operating income for every 100 of revenue, before financing costs and tax.`}`,
      'analysis.metrics.profitability.operatingMarginTtm',
    );
  }
  financials.charts = reportedCharts(input, sources);
  if (growth !== null && margin !== null) {
    paragraph(
      financials,
      growth > 0 && margin < 0
        ? 'Read these figures together: sales are expanding, but the business has not generated positive operating income over the trailing twelve months. Growth and profitability answer different questions.'
        : 'Read growth and profitability together. Sales show demand; operating margin shows how much remains after operating costs. Their reporting periods can differ.',
      'model',
      [
        calculationSource('analysis.metrics.growth.revenueGrowthYoY'),
        calculationSource('analysis.metrics.profitability.operatingMarginTtm'),
      ],
    );
  }
  if (!financials.paragraphs.length && !financials.charts.length) {
    paragraph(
      financials,
      'There is not enough saved financial evidence to explain the recent performance. Missing figures are not treated as zero.',
      'explanation',
    );
  }
  financials.evidenceIds = ['financials'];
  companyEvidence('sec-managementExplanations');
  companyEvidence('sec-operatingKpis');
  companyEvidence('sec-materialEvents');
  companyEvidence('sec-segmentIntelligence');

  const cash = section('funding', 'Can the business support its plans?');
  const fcf = metric('cashFlow', 'freeCashFlowMargin');
  const liquidity = metric('balanceSheet', 'currentRatio');
  const dilution = metric('dilution', 'dilutedShareGrowthYoY');
  if (fcf !== null)
    calculated(
      cash,
      `The saved free cash flow margin is ${format(fcf)}%. ${fcf < 0 ? 'Cash flow after capital spending was negative on this measure. The financing of investment therefore deserves attention.' : 'This measure indicates the cash flow remaining after capital spending relative to revenue.'} It is different from accounting profit.`,
      'analysis.metrics.cashFlow.freeCashFlowMargin',
    );
  if (liquidity !== null && liquidity >= 0)
    calculated(
      cash,
      `The current ratio is ${format(liquidity)}:1: roughly ${format(liquidity)} of short-term assets for each 1 of short-term liabilities. The ability to meet obligations also depends on when cash is received and when payments fall due.`,
      'analysis.metrics.balanceSheet.currentRatio',
    );
  if (dilution !== null)
    calculated(
      cash,
      `The diluted share count ${dilution === 0 ? 'was unchanged' : `${dilution > 0 ? 'increased' : 'decreased'} ${format(Math.abs(dilution))}%`} from a year earlier. A changing share count matters because company-wide growth and growth per share can differ.`,
      'analysis.metrics.dilution.dilutedShareGrowthYoY',
    );

  const fair = record(analysis.fairValue);
  const price = numeric(fair.currentPrice);
  const reference = numeric(fair.estimatedFairValue);
  const currency = text(fair.currency);
  const methods = Array.isArray(fair.methods) ? fair.methods.map(record) : [];
  const usesPeers = methods.some((method) => method.source === 'peer');
  const valuation = section('valuation', 'How does the price compare with the model?');
  if (fair.eligible === true && reference !== null && reference > 0) {
    calculated(
      valuation,
      `StockPilot’s saved valuation reference is ${currency ? `${currency} ` : ''}${money(reference)}${price !== null && price > 0 ? `, compared with a saved share price of ${currency ? `${currency} ` : ''}${money(price)}` : ''}. This is a model estimate, not a guaranteed selling price or a live quote.`,
      'analysis.fairValue',
    );
    if (price !== null && price > 0 && /^[A-Z]{3}$/.test(currency)) {
      const sourceIds = [calculationSource('analysis.fairValue')];
      valuation.charts.push({
        id: 'valuation',
        title: 'Price and model reference',
        kind: 'model',
        unit: currency,
        description:
          'Both bars use the same currency and scale. The model reference is an estimate, not a promised return.',
        points: [
          {label: 'Saved price', value: price, sourceIds},
          {label: 'Model reference', value: reference, sourceIds},
        ],
        footnote: usesPeers
          ? 'Peer-based model: business comparability has not been validated. This gap is not proof of mispricing.'
          : 'Model assumptions can change. Prices are from the financial snapshot.',
      });
    }
  } else
    paragraph(
      valuation,
      'The available data does not support an eligible valuation estimate. No price target is shown.',
      'explanation',
    );
  if (usesPeers) {
    const peers = record(analysis.peerComparison);
    calculated(
      valuation,
      `This valuation uses peer comparisons${text(peers.industry) ? ` associated with ${text(peers.industry)}` : ''}. Business comparability has not been validated. Treat the reference cautiously until the peer group is confirmed to match the company’s activities.`,
      'analysis.fairValue.methods',
    );
  }
  valuation.evidenceIds = ['valuation', 'peers'];

  const outlook = record(analysis.earningsOutlook);
  const revenue = record(outlook.revenue);
  const current = numeric(revenue.currentEstimate);
  const next = numeric(revenue.nextEstimate);
  const currentPeriod = text(outlook.currentPeriod);
  const nextPeriod = text(outlook.nextPeriod);
  const forecast = section('earnings', 'What do analysts expect next?');
  const dated =
    validPeriod(currentPeriod) && validPeriod(nextPeriod) && currentPeriod < nextPeriod;
  if (current !== null && current > 0 && next !== null && next >= 0 && dated) {
    const change = (next / current - 1) * 100;
    const indexedNext = (next / current) * 100;
    if (Number.isFinite(change) && Number.isFinite(indexedNext)) {
      calculated(
        forecast,
        `The saved revenue estimates imply ${format(Math.abs(change))}% ${change < 0 ? 'lower' : 'higher'} revenue for the period ending ${nextPeriod} than for the period ending ${currentPeriod}. These are analyst expectations; actual results may differ.`,
        'analysis.earningsOutlook',
        'forecast',
      );
      forecast.charts.push({
        id: 'revenue-outlook',
        title: 'Expected revenue change',
        kind: 'forecast',
        unit: 'Index',
        description:
          'The first forecast is set to 100. A value of 150 would mean revenue 50% higher; these are not currency amounts.',
        points: [
          {
            label: currentPeriod,
            value: 100,
            sourceIds: [calculationSource('analysis.earningsOutlook')],
          },
          {
            label: nextPeriod,
            value: indexedNext,
            sourceIds: [calculationSource('analysis.earningsOutlook')],
          },
        ],
        footnote:
          'Both bars are forecasts, not reported results. The saved output does not specify forecast currency, so the chart shows relative change only.',
      });
    }
  }
  const eps = record(outlook.eps);
  const currentEps = numeric(eps.currentEstimate);
  const nextEps = numeric(eps.nextEstimate);
  if (dated && currentEps !== null && nextEps !== null) {
    let interpretation: string;
    if (currentEps < 0 && nextEps < 0)
      interpretation = `The saved earnings-per-share estimates remain negative in both periods, with ${nextEps > currentEps ? 'a smaller' : nextEps < currentEps ? 'a larger' : 'an unchanged'} expected loss per share in the later period.`;
    else if (currentEps < 0 && nextEps >= 0)
      interpretation =
        'The saved earnings-per-share estimates move from a loss toward break-even or profit in the later period. That improvement is a forecast, not an achieved result.';
    else if (currentEps >= 0 && nextEps < 0)
      interpretation =
        'The saved earnings-per-share estimates move from break-even or profit to a loss in the later period.';
    else
      interpretation =
        'The saved earnings-per-share estimates are non-negative in both periods. They describe expected earnings attributable to each share, not cash paid to shareholders.';
    calculated(
      forecast,
      `${interpretation} The periods end on ${currentPeriod} and ${nextPeriod}.`,
      'analysis.earningsOutlook',
      'forecast',
    );
  }
  if (!forecast.paragraphs.length)
    paragraph(
      forecast,
      'There is not enough dated forecast evidence to describe the outlook reliably.',
      'explanation',
    );
  if (outlook.eligible !== true)
    paragraph(
      forecast,
      'The available estimates do not meet the evidence requirements for an Earnings Outlook score. Individual forecasts are shown only where usable.',
      'explanation',
    );
  forecast.evidenceIds = ['earnings'];
  companyEvidence('sec-riskFactors');

  const conclusion = section('conclusion', 'What to take away');
  if (growth !== null && margin !== null) {
    paragraph(
      conclusion,
      growth > 0 && margin < 0
        ? 'The financial picture combines revenue growth with an operating loss. Follow whether growth begins to produce operating profit, alongside the funding needed to support the business.'
        : growth > 0 && margin > 0
          ? 'The saved figures show revenue growth and a positive operating margin. Follow whether those conditions persist and translate into cash available after investment.'
          : 'Use the growth and profitability figures together, and follow how they change in the next results. A single snapshot does not establish a lasting business trend.',
      'model',
      [
        calculationSource('analysis.metrics.growth.revenueGrowthYoY'),
        calculationSource('analysis.metrics.profitability.operatingMarginTtm'),
      ],
    );
  } else
    paragraph(
      conclusion,
      'The available evidence does not support a complete financial conclusion. Use the dated disclosures and the coverage notes to see what is known and what is still missing.',
      'explanation',
    );
  paragraph(
    conclusion,
    'A useful next update would show changes in sales, operating profit, cash flow and the delivery of disclosed plans. These are things to monitor, not a prediction of the share price.',
    'explanation',
  );
  conclusion.evidenceIds = ['investment-case', 'scores'];
  return {
    headline: `${input.companyName || input.symbol}: the business behind the stock`,
    introduction:
      'What the company does, how it is performing and what deserves attention next. Each explanation distinguishes calculations, forecasts and company disclosures.',
    sections: sections.filter(
      (item) => item.paragraphs.length || item.charts.length || item.evidenceIds.length,
    ),
  };
}
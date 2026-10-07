import {
  LAYER_NAMES,
  type Evidence,
  type LayerName,
  type ResearchLayers,
} from '../sec-research/sec-research.types';

export function validEvidence(item: Evidence): boolean {
  if (
    !item ||
    typeof item.quote !== 'string' ||
    item.quote.length < 45 ||
    item.quote.length > 10000
  )
    return false;
  const source = item.source;
  if (
    !source ||
    !/^\d{10}$/.test(source.cik) ||
    !/^\d{10}-\d{2}-\d{6}$/.test(source.accession)
  )
    return false;
  if (
    !/^[a-f0-9]{64}$/.test(source.sha256) ||
    source.rawPath !== `sec/raw/${source.sha256}.bin`
  )
    return false;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(source.filedAt) ||
    !Number.isFinite(Date.parse(source.filedAt))
  )
    return false;
  try {
    const url = new URL(source.url);
    const prefix = `/Archives/edgar/data/${Number(source.cik)}/${source.accession.replace(/-/g, '')}/`;
    return (
      url.protocol === 'https:' &&
      url.hostname === 'www.sec.gov' &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(prefix)
    );
  } catch {
    return false;
  }
}

const isRisk = (item: Evidence): boolean =>
  /risk factors|risks (?:related|relating|associated)|we (?:may|might|could) (?:not|be unable)|adversely affect|could (?:materially )?harm|no assurance|inherent uncertainty/i.test(
    `${item.section} ${item.quote}`,
  );

function relevance(item: Evidence, name: LayerName): number {
  if (name === 'businessProfile') {
    if (/primarily operate|business lines|business model/i.test(item.quote)) return 6;
    if (
      /we (?:offer|provide|operate|develop|sell|manufacture)|our (?:products|services|customers)/i.test(
        item.quote,
      )
    )
      return 4;
    if (/headquartered|our business/i.test(item.quote)) return 2;
  }
  if (
    name === 'managementExplanations' &&
    /primarily due to|primarily driven|attributable to/i.test(item.quote)
  )
    return 3;
  return 0;
}

export function selectReportEvidence(layers: ResearchLayers, name: LayerName): Evidence[] {
  const own = layers[name]?.evidence ?? [];
  const items =
    name === 'riskFactors'
      ? [...own, ...LAYER_NAMES.flatMap((key) => layers[key]?.evidence ?? []).filter(isRisk)]
      : own;
  const seen = new Set<string>();
  const perDocument = new Map<string, number>();
  const candidates = items
    .filter((item) => {
      if (!validEvidence(item)) return false;
      if (
        /forward-looking statements|safe harbor|undue reliance|table of contents/i.test(
          item.quote,
        )
      )
        return false;
      if (name !== 'riskFactors' && isRisk(item)) return false;
      if (
        name === 'businessProfile' &&
        /registered office|agent for service|following discussion reflects|incorporated herein by reference/i.test(
          item.quote,
        )
      )
        return false;
      if (name === 'segmentIntelligence') {
        const context = `${item.context} ${item.quote}`;
        if (!/\d/.test(item.quote) || !/revenue|sales|income|profit|assets/i.test(context))
          return false;
        if (
          !/segment|geograph|disaggregat|revenue by|revenues by|countries|jurisdictions/i.test(
            context,
          )
        )
          return false;
      }
      if (
        name === 'segmentIntelligence' &&
        /adversely affect|could harm|risk factors/i.test(item.quote)
      )
        return false;
      if (
        name === 'managementExplanations' &&
        !/due to|driven by|attributable|reflect|because|increase|decrease/i.test(item.quote)
      )
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.source.filedAt.localeCompare(a.source.filedAt) ||
        relevance(b, name) - relevance(a, name) ||
        a.block - b.block,
    );
  const selected: Evidence[] = [];
  let size = 0;
  // Limit repetition while retaining more than one filing period where available.
  for (const item of candidates) {
    const key = item.quote.replace(/\s+/g, ' ').trim();
    const count = perDocument.get(item.source.url) ?? 0;
    if (seen.has(key) || count >= 4 || size + key.length > 20000) continue;
    selected.push(item);
    seen.add(key);
    size += key.length;
    perDocument.set(item.source.url, count + 1);
    if (selected.length === 8) break;
  }
  return selected;
}
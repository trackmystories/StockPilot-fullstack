import {loadBuffer} from 'cheerio';
import type {AnyNode} from 'domhandler';
import {
  emptyLayers,
  EXTRACTOR_VERSION,
  hash,
  LAYER_NAMES,
  type EvidenceSource,
  type Extraction,
  type Filing,
  type LayerName,
} from './sec-research.types';

export type Block = {text: string; table: string | null; heading: boolean; headingLevel?: number};
export type FilingColumns = {
  form: string[];
  accessionNumber: string[];
  filingDate: string[];
  reportDate?: string[];
  primaryDocument: string[];
};
export type Ticker = {ticker: string; cik_str: number};
const clean = (value: string): string => value.replace(/\s+/g, ' ').trim();

export function resolveCik(symbol: string, tickers: Ticker[]): string | null {
  const matches = new Set(
    tickers
      .filter((row) => row.ticker.toUpperCase() === symbol.toUpperCase())
      .map((row) => String(row.cik_str).padStart(10, '0')),
  );
  return matches.size === 1 ? [...matches][0] : null;
}

export function selectFilings(data: FilingColumns, since: string): Filing[] {
  if (
    !Array.isArray(data.form) ||
    !Array.isArray(data.accessionNumber) ||
    !Array.isArray(data.filingDate) ||
    !Array.isArray(data.primaryDocument)
  ) {
    throw new Error('Invalid SEC filing history.');
  }
  return data.form
    .flatMap((form, index) => {
      if (!/^(10-K|10-Q|8-K|20-F|40-F|6-K)(\/A)?$/.test(form) || data.filingDate[index] < since)
        return [];
      const accession = data.accessionNumber[index];
      const primaryDocument = data.primaryDocument[index];
      if (
        !/^\d{10}-\d{2}-\d{6}$/.test(accession) ||
        !primaryDocument ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.filingDate[index])
      ) {
        throw new Error('Incomplete SEC filing metadata.');
      }
      return [
        {
          accession,
          form,
          primaryDocument,
          filedAt: data.filingDate[index],
          reportDate: data.reportDate?.[index] ?? '',
        },
      ];
    })
    .sort((a, b) => b.filedAt.localeCompare(a.filedAt) || b.accession.localeCompare(a.accession));
}

export function parseDocument(bytes: Buffer): Block[] {
  const rawText = bytes.toString('utf8');
  if (!/<(?:html|body|p|div|table|h[1-6]|br)\b/i.test(rawText)) {
    return rawText
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => ({
        text: clean(paragraph),
        table: null,
        heading: false,
      }))
      .filter((block) => block.text.length > 0);
  }
  const $ = loadBuffer(bytes);
  $('script,style,noscript,head,[hidden]').remove();
  $('*').each((_, node) => {
    const style = $(node).attr('style') ?? '';
    if (
      ('tagName' in node && node.tagName.toLowerCase() === 'ix:hidden') ||
      /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)
    )
      $(node).remove();
  });
  const blocks: Block[] = [];
  let pending = '';
  const flush = () => {
    const text = clean(pending);
    if (text) blocks.push({text, table: null, heading: false});
    pending = '';
  };
  const visit = (node: AnyNode): void => {
    if (node.type === 'text') {
      pending += node.data;
      return;
    }
    if (!('children' in node)) return;
    const tag = 'tagName' in node ? node.tagName.toLowerCase() : '';
    const boundary = /^(p|div|li|h[1-6]|br|tr|section|pre)$/.test(tag);
    if (boundary || tag === 'table') flush();
    if (tag === 'table' && $(node).find('table').length === 0) {
      const rows = $(node)
        .find('tr')
        .toArray()
        .map((row) =>
          $(row)
            .children('td,th')
            .toArray()
            .map((cell) => clean($(cell).text())),
        );
      if (
        rows.length > 1 &&
        rows.some((row) => row.length > 1) &&
        /\d/.test(rows.flat().join(' '))
      ) {
        const table = rows.map((row) => row.join(' | ')).join('\n');
        blocks.push({text: clean(table), table, heading: false});
        return;
      }
    }
    const start = blocks.length;
    node.children.forEach(visit);
    if (boundary || tag === 'table') flush();
    if (/^h[1-6]$/.test(tag) && blocks.length > start) {
      blocks[start].heading = true;
      blocks[start].headingLevel = Number(tag.slice(1));
    }
  };
  $.root().contents().toArray().forEach(visit);
  flush();
  return blocks;
}

const profile =
  /^(?:item\s+\d+[a-z.]*[.\s:-]*)?(?:business|business overview|overview of (?:our|the) business|information on the company|organizational structure|business model|products and services)\b/i;
const risk = /^(?:item\s+\d+[a-z.]*[.\s:-]*)?risk factors\b/i;
const management =
  /management.{0,8}(?:discussion|analysis)|operating and financial review|results of operations/i;
const metricsHeading =
  /^(?:key |selected )?(?:operating|operational|business|performance) (?:metrics|indicators|statistics)|^key performance indicators/i;
const kpi =
  /\b(?:hash\s?rate|EH\/s|PH\/s|TH\/s|megawatts?|gigawatts?|MW|GW|bitcoin production|bitcoins? mined|BTC|ARR|annual(?:ized)? recurring revenue|retention|churn|active users|subscribers|occupancy|same.store sales|production volume|backlog|capacity|GPUs?|SEALMINER)\b/i;
const segment =
  /\b(?:segments?|geograph(?:ic|ical)|disaggregat(?:ed|ion)|revenue by|revenues by)\b/i;
const event =
  /\b(?:entered into|completed (?:the |an? )?(?:acquisition|sale|merger)|acquired|appointed|resigned|filed (?:a |an? )?(?:lawsuit|complaint)|issued .{0,35}(?:notes|shares)|closed .{0,35}(?:financing|offering)|project delay)\b/i;

export function extractLayers(blocks: Block[], source: EvidenceSource): Extraction {
  const layers = emptyLayers();
  const warnings = new Set<string>();
  let section = '';
  let sectionLayer: LayerName | null = null;
  let previous = '';
  let sectionLevel = 0;
  blocks.forEach((block, index) => {
    const text = block.text;
    const heading =
      block.heading ||
      (text.length < 220 &&
        (/^item\s+\d+/i.test(text) ||
          profile.test(text) ||
          risk.test(text) ||
          management.test(text) ||
          metricsHeading.test(text) ||
          /^segment (?:information|reporting)/i.test(text)));
    if (heading) {
      const classification: LayerName | null = risk.test(text)
        ? 'riskFactors'
        : management.test(text)
          ? 'managementExplanations'
          : profile.test(text)
            ? 'businessProfile'
            : metricsHeading.test(text)
              ? 'operatingKpis'
              : segment.test(text)
                ? 'segmentIntelligence'
                : null;
      const majorHeading =
        /^item\s+\d+/i.test(text) ||
        (block.headingLevel !== undefined && block.headingLevel <= sectionLevel);
      if (classification || majorHeading) {
        section = text;
        sectionLayer = classification;
        sectionLevel = block.headingLevel ?? 2;
      }
      previous = text;
      return;
    }
    const categories = new Set<LayerName>();
    if ((text.length >= 45 || block.table) && sectionLayer) categories.add(sectionLayer);
    if (text.length >= 45 && /\d/.test(text) && kpi.test(text)) categories.add('operatingKpis');
    if (text.length >= 45 && event.test(text)) categories.add('materialEvents');
    if (/\d/.test(text) && segment.test(`${section} ${previous} ${text}`))
      categories.add('segmentIntelligence');
    if (
      text.length >= 45 &&
      /\b(?:due to|driven by|attributable to|primarily reflect)\b/i.test(text) &&
      /\b(?:revenue|margin|income|cost|expense|production|growth|increase|decrease)\b/i.test(text)
    ) {
      categories.add('managementExplanations');
    }
    if (text.length > 12000) {
      warnings.add('Oversized evidence block omitted; consult the raw document.');
      previous = text.slice(-1200);
      return;
    }
    for (const name of categories) {
      const layer = layers[name];
      if (layer.evidence.length >= 60) {
        layer.omittedEvidenceCount++;
        continue;
      }
      layer.status = 'evidence_available';
      layer.evidence.push({
        id: hash(`${source.sha256}:${index}:${name}`),
        quote: text,
        context: previous.slice(-1200),
        section,
        block: index,
        table: block.table,
        attribution: name === 'managementExplanations' ? 'management' : 'issuer_disclosure',
        interpretation: 'source_excerpt_not_independently_verified',
        source,
      });
    }
    previous = text;
  });
  if (!blocks.length) warnings.add('Document contained no readable text; OCR is not implemented.');
  for (const name of LAYER_NAMES) {
    if (layers[name].omittedEvidenceCount) warnings.add(`${name}: evidence cap reached.`);
  }
  return {version: EXTRACTOR_VERSION, source, layers, warnings: [...warnings]};
}
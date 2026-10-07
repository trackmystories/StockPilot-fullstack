import {Injectable} from '@nestjs/common';
import {loadBuffer} from 'cheerio';
import {SecCacheService} from './sec-cache.service';
import {
  extractLayers,
  parseDocument,
  selectFilings,
  type FilingColumns,
  type Ticker,
} from './sec-extractor';
import {
  emptyLayers,
  EXTRACTOR_VERSION,
  hash,
  type Extraction,
  type Filing,
} from './sec-research.types';

type Submission = {
  cik: string;
  filings: {recent: FilingColumns; files?: {name: string; filingTo: string}[]};
};
const DAY = 86400000;

@Injectable()
export class SecIngestionService {
  constructor(private readonly cache: SecCacheService) {}

  async tickers(): Promise<Ticker[]> {
    const response = await this.cache.get('https://www.sec.gov/files/company_tickers.json', DAY);
    const rows = Object.values(JSON.parse(response.bytes.toString('utf8'))) as Ticker[];
    if (
      !rows.length ||
      rows.some(
        (row) =>
          typeof row.ticker !== 'string' || !Number.isSafeInteger(row.cik_str) || row.cik_str <= 0,
      )
    ) {
      throw new Error('Invalid SEC ticker mapping.');
    }
    return rows;
  }

  async filings(cik: string, since: string, heartbeat: () => Promise<void>): Promise<Filing[]> {
    const response = await this.cache.get(`https://data.sec.gov/submissions/CIK${cik}.json`, DAY);
    const data = JSON.parse(response.bytes.toString('utf8')) as Submission;
    if (String(data.cik).padStart(10, '0') !== cik || !data.filings?.recent) {
      throw new Error('SEC submissions do not match the requested issuer.');
    }
    const result = selectFilings(data.filings.recent, since);
    for (const page of data.filings.files ?? []) {
      if (page.filingTo < since) continue;
      if (!/^CIK\d{10}-submissions-\d+\.json$/.test(page.name))
        throw new Error('Invalid SEC history path.');
      await heartbeat();
      const history = await this.cache.get(`https://data.sec.gov/submissions/${page.name}`, DAY);
      result.push(
        ...selectFilings(JSON.parse(history.bytes.toString('utf8')) as FilingColumns, since),
      );
    }
    return [...new Map(result.map((item) => [item.accession, item])).values()].sort(
      (a, b) => b.filedAt.localeCompare(a.filedAt) || b.accession.localeCompare(a.accession),
    );
  }

  async extractFiling(
    cik: string,
    filing: Filing,
    heartbeat: () => Promise<void>,
  ): Promise<Extraction[]> {
    const filingKey = `sec/filings/v${EXTRACTOR_VERSION}/${hash(JSON.stringify({cik, filing}))}.json`;
    const cached = await this.cache.readJson<Extraction[]>(filingKey);
    if (cached) return cached;
    const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${filing.accession.replace(/-/g, '')}/`;
    const index = await this.cache.get(`${base}${filing.accession}-index.html`, 0, true);
    const $ = loadBuffer(index.bytes);
    const urls = new Set<string>([new URL(filing.primaryDocument, base).href]);
    const ignored = new Set<string>();
    $('table.tableFile tr').each((_, row) => {
      const cells = $(row).children('td');
      const type = cells.eq(3).text().trim();
      const href = cells.eq(2).find('a').attr('href');
      if (!href) return;
      if (!/^(?:10-K|10-Q|20-F|40-F|6-K|8-K)(?:\/A)?$|^EX-(?:99|13|10)(?:\.|$)/i.test(type)) {
        if (type.startsWith('EX-') && !/^EX-101|^EX-104/.test(type))
          ignored.add(`Exhibit outside extraction scope (${type}): ${href}`);
        return;
      }
      let url = new URL(href, base);
      const inlineDocument = url.searchParams.get('doc');
      if (inlineDocument) url = new URL(inlineDocument, 'https://www.sec.gov');
      if (!url.href.startsWith(base)) {
        ignored.add(`Linked exhibit outside this filing was skipped: ${url.href}`);
        return;
      }
      if (/\.(?:html?|txt)$/i.test(url.pathname)) urls.add(url.href);
      else ignored.add(`Unsupported exhibit ${type}: ${url.href}`);
    });
    if (!$('table.tableFile').length)
      throw new Error(`Missing document index: ${filing.accession}`);
    const results: Extraction[] = [];
    for (const url of urls) {
      if (!url.startsWith(base)) throw new Error('Invalid SEC primary document path.');
      await heartbeat();
      if (!/\.(?:html?|txt)$/i.test(new URL(url).pathname)) {
        ignored.add(`Unsupported primary document: ${url}`);
        continue;
      }
      const document = await this.cache.get(url, 0, true);
      const key = `sec/extracted/v${EXTRACTOR_VERSION}/${hash(`${cik}:${filing.accession}:${url}:${document.sha256}`)}.json`;
      const stored = await this.cache.readJson<Extraction>(key);
      if (stored?.version === EXTRACTOR_VERSION) {
        results.push(stored);
        continue;
      }
      const {primaryDocument: _, ...metadata} = filing;
      const extracted = extractLayers(parseDocument(document.bytes), {
        ...metadata,
        cik,
        url,
        rawPath: document.rawPath,
        sha256: document.sha256,
      });
      await this.cache.writeJson(key, extracted);
      results.push(extracted);
    }
    if (ignored.size) {
      results.push({
        version: EXTRACTOR_VERSION,
        source: null,
        layers: emptyLayers(),
        warnings: [...ignored],
      });
    }
    await this.cache.writeJson(filingKey, results);
    return results;
  }
}
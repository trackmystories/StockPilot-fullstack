import {useState} from 'react';
import {Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {CompanyReport, ReportSource} from '../types/companyReport';
import {ReportArticleSection} from './ReportArticleSection';
import {ReportEvidenceSection} from './ReportEvidence';

type Props = {report: CompanyReport; stale: boolean; onRefresh: () => void};
const displayDate = (value: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Not available';
};
const glossary = [
  {
    term: 'Revenue',
    match: /revenue/i,
    definition: 'Money earned from selling products or services, before costs are subtracted.',
  },
  {
    term: 'Operating margin',
    match: /operating margin/i,
    definition:
      'Operating profit or loss as a percentage of revenue, before financing costs and tax.',
  },
  {
    term: 'Free cash flow',
    match: /free cash flow/i,
    definition:
      'Operating cash flow after capital spending. It differs from accounting profit.',
  },
  {
    term: 'EPS',
    match: /\beps\b|earnings.per.share/i,
    definition:
      'Earnings per share: profit or loss attributable to each share. It is not a dividend.',
  },
  {
    term: 'TTM',
    match: /\bttm\b|trailing twelve/i,
    definition:
      'Trailing twelve months: a rolling year of results, which can differ from a calendar year.',
  },
  {
    term: 'Dilution',
    match: /dilut|share count/i,
    definition:
      'An increase in shares can reduce each existing share’s proportionate ownership.',
  },
  {
    term: 'MW',
    match: /\bmw\b|megawatt/i,
    definition:
      'Megawatts measure power. Electrical capacity and usable IT capacity are different measures; neither is revenue.',
  },
  {
    term: 'Hash rate',
    match: /hash\s?rate|eh\/s/i,
    definition:
      'Computing power devoted to cryptocurrency mining. More computing power does not automatically mean more profit.',
  },
  {
    term: 'ARR',
    match: /\barr\b|annualized recurring/i,
    definition:
      'An annualized recurring-revenue measure. It is not necessarily revenue already earned over a full year.',
  },
  {
    term: 'Colocation',
    match: /colocation/i,
    definition:
      'Providing data-center space, power and supporting infrastructure for customers’ computing equipment.',
  },
  {
    term: 'Nonbinding agreement',
    match: /non.binding/i,
    definition:
      'An expression of intent that should not be treated as a completed transaction or guaranteed revenue.',
  },
  {
    term: 'EBITDA',
    match: /ebitda/i,
    definition:
      'Earnings before interest, tax, depreciation and amortization. Adjusted versions may exclude other items and are not free cash flow.',
  },
];

export function CompanyReportView({report, stale, onRefresh}: Props) {
  const [source, setSource] = useState<ReportSource | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const article = report.article;
  const content = article ? JSON.stringify(article.sections) : JSON.stringify(report.sections);
  const terms = glossary.filter((item) => item.match.test(content));
  const selectSource = (next: ReportSource) => {
    setSource(next);
    setLinkError(null);
  };
  const openFiling = async () => {
    if (!source?.url) return;
    try {
      const url = new URL(source.url);
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'www.sec.gov' ||
        url.port ||
        url.username ||
        url.password
      )
        throw new Error('Invalid filing link');
      await Linking.openURL(source.url);
    } catch {
      setLinkError('Could not open the filing. Please try again.');
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STOCKPILOT / COMPANY RESEARCH</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {report.companyName || report.symbol}
        </Text>
        <Text style={styles.symbol}>{report.symbol} · The business behind the stock</Text>
        <Text style={styles.introduction}>
          {article?.introduction ||
            'Explore the available financial analysis and company disclosures below.'}
        </Text>
        <Text style={styles.date}>Prepared {displayDate(report.generatedAt)}</Text>
      </View>
      <View style={styles.dates}>
        <View style={styles.dateColumn}>
          <Text style={styles.small}>Financial snapshot</Text>
          <Text style={styles.dateValue}>{displayDate(report.financialAsOf)}</Text>
        </View>
        <View style={styles.dateColumn}>
          <Text style={styles.small}>Latest cited filing</Text>
          <Text style={styles.dateValue}>{displayDate(report.secAsOf)}</Text>
        </View>
      </View>
      {stale || report.status === 'limited' ? (
        <View style={styles.notice}>
          <Text style={styles.note}>
            {stale
              ? 'This report uses an older or incomplete snapshot. Check the dates before relying on the figures.'
              : 'Some evidence is incomplete. The report explains what is available; coverage details appear below.'}
          </Text>
        </View>
      ) : null}
      {article ? (
        article.sections.map((section) => (
          <ReportArticleSection
            key={section.id}
            section={section}
            report={report}
            onSource={selectSource}
          />
        ))
      ) : (
        <View style={styles.legacy}>
          <Text style={styles.body}>
            The readable report and charts will appear after this company’s next report update.
            Its existing evidence remains available below.
          </Text>
          {report.sections.map((section) => (
            <ReportEvidenceSection
              key={section.id}
              section={section}
              sources={report.sources}
              onSource={selectSource}
            />
          ))}
        </View>
      )}
      {terms.length ? (
        <View style={styles.footerSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{expanded: showGlossary}}
            onPress={() => setShowGlossary(!showGlossary)}
            style={styles.sectionButton}
          >
            <Text style={styles.sectionTitle}>Terms in this report</Text>
            <Text style={styles.expand}>{showGlossary ? '−' : '+'}</Text>
          </Pressable>
          {showGlossary
            ? terms.map((item) => (
                <View key={item.term} style={styles.definition}>
                  <Text style={styles.term}>{item.term}</Text>
                  <Text style={styles.body}>{item.definition}</Text>
                </View>
              ))
            : null}
        </View>
      ) : null}
      <View style={styles.footerSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{expanded: showCoverage}}
          onPress={() => setShowCoverage(!showCoverage)}
          style={styles.sectionButton}
        >
          <Text style={styles.sectionTitle}>Sources & coverage</Text>
          <Text style={styles.expand}>{showCoverage ? '−' : '+'}</Text>
        </Pressable>
        {showCoverage ? (
          <View style={styles.coverage}>
            <Text style={styles.body}>{report.methodology}</Text>
            {report.coverage.gaps.map((gap) => (
              <Text key={gap} style={styles.note}>
                • {gap}
              </Text>
            ))}
            {report.sources.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => selectSource(item)}
                style={styles.sourceButton}
              >
                <Text style={styles.link}>
                  [{index + 1}]{' '}
                  {item.kind === 'sec' ? item.label : 'StockPilot financial analysis'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refreshButton}>
        <Text style={styles.link}>Check for an updated report</Text>
      </Pressable>
      <Text style={styles.footer}>
        Calculations, analyst forecasts and company disclosures are identified separately.
        Charts show available evidence, not a prediction of investment returns.
      </Text>
      {source ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setSource(null)}>
          <View style={styles.backdrop}>
            <View style={styles.sourcePanel} accessibilityViewIsModal>
              <ScrollView contentContainerStyle={styles.sourceContent}>
                <Text style={styles.sectionTitle}>
                  {source.kind === 'sec' ? source.label : 'StockPilot financial analysis'}
                </Text>
                <Text style={styles.body}>Source date: {displayDate(source.asOf)}</Text>
                {source.reportDate ? (
                  <Text style={styles.small}>Reporting period: {source.reportDate}</Text>
                ) : null}
                {source.accession ? (
                  <Text selectable style={styles.small}>
                    Filing identifier: {source.accession}
                  </Text>
                ) : null}
                {source.url ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      void openFiling();
                    }}
                    style={styles.filingButton}
                  >
                    <Text style={styles.filingButtonText}>Open SEC filing ↗</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.body}>
                    This figure comes from StockPilot’s saved financial analysis. It is not a
                    live quote.
                  </Text>
                )}
                {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSource(null)}
                  style={styles.sourceButton}
                >
                  <Text style={styles.link}>Close source details</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    paddingHorizontal: 4,
    paddingBottom: 26,
  },
  header: {
    paddingVertical: 20,
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: '#617669',
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    color: '#153326',
  },
  symbol: {
    fontSize: 13,
    fontWeight: '600',
    color: '#07855F',
  },
  introduction: {
    fontSize: 16,
    lineHeight: 25,
    color: '#52685A',
  },
  date: {
    fontSize: 11,
    lineHeight: 17,
    color: '#65796B',
  },
  dates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#DFE7E1',
  },
  dateColumn: {
    flexGrow: 1,
    flexBasis: 125,
    gap: 5,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#294335',
  },
  small: {
    fontSize: 11,
    lineHeight: 18,
    color: '#65796B',
  },
  notice: {
    backgroundColor: '#FBF6E8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  note: {
    fontSize: 12,
    lineHeight: 19,
    color: '#70582E',
  },
  body: {
    fontSize: 14,
    lineHeight: 23,
    color: '#42594A',
  },
  legacy: {
    gap: 14,
    paddingVertical: 15,
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#DFE7E1',
  },
  sectionButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#183D2A',
  },
  expand: {
    fontSize: 22,
    color: '#07855F',
  },
  coverage: {
    gap: 10,
    paddingBottom: 18,
  },
  definition: {
    gap: 5,
    paddingBottom: 17,
  },
  term: {
    fontSize: 13,
    fontWeight: '700',
    color: '#294335',
  },
  sourceButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  link: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
    color: '#087758',
  },
  refreshButton: {
    paddingVertical: 20,
    minHeight: 44,
    alignItems: 'center',
  },
  footer: {
    fontSize: 10,
    lineHeight: 17,
    color: '#6C7F71',
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(10, 24, 18, 0.5)',
  },
  sourcePanel: {
    maxHeight: '80%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sourceContent: {
    padding: 20,
    gap: 13,
  },
  filingButton: {
    backgroundColor: '#087758',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 8,
  },
  filingButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  error: {
    fontSize: 12,
    color: '#A83232',
  },
});

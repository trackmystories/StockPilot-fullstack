import {useState} from 'react';
import {Linking, Modal, Pressable, ScrollView, Text, View, StyleSheet} from 'react-native';

import type {
  CompanyReport,
  ReportSection,
  ReportSource,
  ReportStatement,
  ReportTable,
} from '../types/reports.ts';

const displayDate = (value: string | null): string => {
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

function Sources({
  ids,
  sources,
  onSource,
}: {
  ids: string[];
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  return (
    <View style={styles.sourceRow}>
      {ids.map((id) => {
        const index = sources.findIndex((source) => source.id === id);
        if (index < 0) return null;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`View source ${index + 1}: ${sources[index].label}`}
            onPress={() => onSource(sources[index])}
            style={styles.sourceButton}
          >
            <Text style={styles.sourceText}>
              [{index + 1}]{' '}
              {sources[index].kind === 'sec' ? sources[index].label : 'Saved calculation'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Statement({
  item,
  sources,
  onSource,
}: {
  item: ReportStatement;
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const quote = item.kind === 'issuer' || item.kind === 'management';
  const table = item.text.includes('\n') && item.text.includes('|');
  const long = item.text.length > 450;
  return (
    <View style={styles.statement}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {quote ? (
        <Text style={styles.attribution}>
          {item.kind === 'management'
            ? 'Management’s explanation · source excerpt'
            : 'Issuer disclosure · source excerpt'}
        </Text>
      ) : null}
      {table && item.context ? (
        <Text selectable style={styles.small}>
          {item.context}
        </Text>
      ) : null}
      {table ? (
        <ScrollView
          horizontal
          style={styles.tableScroll}
          accessibilityLabel="Original filing table"
        >
          <Text selectable style={styles.rawTable}>
            {item.text}
          </Text>
        </ScrollView>
      ) : (
        <Text
          selectable
          numberOfLines={long && !expanded ? 6 : undefined}
          style={[styles.body, quote && styles.quote]}
        >
          {item.text}
        </Text>
      )}
      {(long || !!item.context) && !table ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{expanded}}
          onPress={() => setExpanded(!expanded)}
          style={styles.textButton}
        >
          <Text style={styles.link}>
            {expanded ? 'Show less' : long ? 'Read full excerpt' : 'Read source context'}
          </Text>
        </Pressable>
      ) : null}
      {expanded && item.context ? (
        <View style={styles.context}>
          <Text style={styles.attribution}>Preceding source context</Text>
          <Text selectable style={styles.small}>
            {item.context}
          </Text>
        </View>
      ) : null}
      <Sources ids={item.sourceIds} sources={sources} onSource={onSource} />
    </View>
  );
}

function DataTable({
  table,
  sources,
  onSource,
}: {
  table: ReportTable;
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  return (
    <View style={styles.statement}>
      <Text style={styles.itemTitle}>{table.title}</Text>
      <ScrollView horizontal style={styles.tableScroll}>
        <View>
          <View style={styles.tableHeader}>
            {table.columns.map((column, index) => (
              <Text key={`${column}:${index}`} style={styles.tableHeading}>
                {column}
              </Text>
            ))}
          </View>
          {table.rows.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <Text selectable key={cellIndex} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Sources ids={table.sourceIds} sources={sources} onSource={onSource} />
    </View>
  );
}

function Section({
  section,
  sources,
  onSource,
}: {
  section: ReportSection;
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  const [open, setOpen] = useState(
    ['sec-businessProfile', 'financials', 'investment-case'].includes(section.id),
  );
  const available = section.statements.length + section.tables.length > 0;
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        accessibilityLabel={`${section.title}, ${available ? 'available' : 'limited evidence'}`}
        onPress={() => setOpen(!open)}
        style={styles.sectionHeader}
      >
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.small}>
            {available
              ? `${section.statements.length + section.tables.length} report items`
              : 'Evidence gap'}
          </Text>
        </View>
        <Text style={styles.expand}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.sectionContent}>
          <Text style={styles.description}>{section.description}</Text>
          {section.statements.map((item) => (
            <Statement key={item.id} item={item} sources={sources} onSource={onSource} />
          ))}
          {section.tables.map((table, index) => (
            <DataTable key={index} table={table} sources={sources} onSource={onSource} />
          ))}
          {section.notes.map((note) => (
            <Text key={note} style={styles.note}>
              {note}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CompanyReportView({
  report,
  stale,
  onRefresh,
}: {
  report: CompanyReport;
  stale: boolean;
  onRefresh: () => void;
}) {
  const [source, setSource] = useState<ReportSource | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const selectSource = (next: ReportSource) => {
    setSource(next);
    setLinkError(null);
  };
  const openFiling = async () => {
    if (!source?.url) return;
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.hostname !== 'www.sec.gov')
        throw new Error('Invalid filing link.');
      await Linking.openURL(source.url);
    } catch {
      setLinkError('Could not open the filing. Please try again.');
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>STOCKPILOT RESEARCH</Text>
        <Text style={styles.reportTitle}>{report.companyName || report.symbol}</Text>
        <Text style={styles.heroSubtitle}>{report.symbol} · Company report</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {report.status === 'limited' ? 'Coverage limited' : 'Report available'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {report.coverage.secLayers}/{report.coverage.totalSecLayers} SEC layers
            </Text>
          </View>
        </View>
        <Text style={styles.heroDate}>Prepared {displayDate(report.generatedAt)}</Text>
      </View>

      <View style={styles.dateCard}>
        <View style={styles.flex}>
          <Text style={styles.small}>Financial snapshot</Text>
          <Text style={styles.itemTitle}>{displayDate(report.financialAsOf)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.small}>Latest cited filing</Text>
          <Text style={styles.itemTitle}>{displayDate(report.secAsOf)}</Text>
        </View>
      </View>
      {stale ? (
        <View style={styles.notice}>
          <Text style={styles.note}>
            This report uses an older or incomplete source snapshot. A newer saved report may be
            available after the next update.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle}>At a glance</Text>
          {report.summary.length ? (
            report.summary.map((item) => (
              <Statement
                key={item.id}
                item={item}
                sources={report.sources}
                onSource={selectSource}
              />
            ))
          ) : (
            <Text style={styles.body}>
              The saved data is not sufficient for a financial summary. Available filing evidence
              and coverage gaps appear below.
            </Text>
          )}
        </View>
      </View>

      {report.sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          sources={report.sources}
          onSource={selectSource}
        />
      ))}

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{expanded: showCoverage}}
          onPress={() => setShowCoverage(!showCoverage)}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>Sources & coverage</Text>
          <Text style={styles.expand}>{showCoverage ? '−' : '+'}</Text>
        </Pressable>
        {showCoverage ? (
          <View style={styles.sectionContent}>
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
                <Text style={styles.sourceText}>
                  [{index + 1}] {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {source ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setSource(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.sourcePanel} accessibilityViewIsModal>
              <Text style={styles.sectionTitle}>{source.label}</Text>
              <Text style={styles.body}>Source date: {displayDate(source.asOf)}</Text>
              {source.reportDate ? (
                <Text style={styles.small}>Reporting period: {source.reportDate}</Text>
              ) : null}
              {source.accession ? (
                <Text selectable style={styles.small}>
                  Accession: {source.accession}
                </Text>
              ) : null}
              {source.fieldPath ? (
                <Text selectable style={styles.small}>
                  Saved field: {source.fieldPath}
                </Text>
              ) : null}
              <Text selectable style={styles.small}>
                Snapshot: {report.sourceRunId}
              </Text>
              {source.url ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openFiling();
                  }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Open SEC filing ↗</Text>
                </Pressable>
              ) : (
                <Text style={styles.note}>
                  This figure comes from StockPilot’s saved financial calculations. It is not a live
                  quote.
                </Text>
              )}
              {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSource(null)}
                style={styles.textButton}
              >
                <Text style={styles.link}>Close source details</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refreshButton}>
        <Text style={styles.link}>Check for an updated report</Text>
      </Pressable>
      <Text style={styles.footer}>
        Saved research • Financial models, analyst forecasts and issuer disclosures are labelled
        separately.
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    gap: 14,
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: '#142947',
    borderRadius: 20,
    padding: 22,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#81DBC0',
  },
  reportTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#D2DEEC',
    marginTop: 6,
  },
  heroDate: {
    fontSize: 11,
    color: '#C2D1E2',
    marginTop: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  badge: {
    backgroundColor: '#28415E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DDF8EF',
  },
  dateCard: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  flex: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E1E7EF',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    minHeight: 60,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: '#142947',
  },
  sectionContent: {
    padding: 16,
    gap: 12,
  },
  expand: {
    fontSize: 24,
    color: '#079B73',
    width: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  statement: {
    gap: 6,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    color: '#142947',
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#364963',
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: '#C6E8DC',
    paddingLeft: 10,
  },
  attribution: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  small: {
    fontSize: 11,
    lineHeight: 17,
    color: '#64748B',
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceButton: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  sourceText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#087758',
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  link: {
    fontSize: 12,
    color: '#087758',
    fontWeight: '600',
  },
  context: {
    padding: 10,
    backgroundColor: '#F4F7FA',
    borderRadius: 8,
    gap: 4,
  },
  tableScroll: {
    marginVertical: 8,
  },
  rawTable: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 18,
    color: '#364963',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EDF4F2',
  },
  tableHeading: {
    width: 154,
    padding: 10,
    fontWeight: '700',
    fontSize: 11,
    color: '#142947',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E7EF',
  },
  tableCell: {
    width: 154,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#364963',
  },
  note: {
    fontSize: 11,
    lineHeight: 17,
    color: '#70582E',
  },
  notice: {
    backgroundColor: '#FFF7E8',
    borderRadius: 12,
    padding: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(10, 24, 43, 0.55)',
  },
  sourcePanel: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#92CDB8',
    borderRadius: 16,
    backgroundColor: '#F2FBF7',
    gap: 10,
  },
  button: {
    backgroundColor: '#087758',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 14,
    alignItems: 'center',
  },
  footer: {
    fontSize: 10,
    lineHeight: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  stateCard: {
    marginTop: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1E7EF',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  error: {
    fontSize: 12,
    color: '#A83232',
  },
});
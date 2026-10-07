import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {
  ReportSection,
  ReportSource,
  ReportStatement,
  ReportTable,
} from '../types/companyReport';

export function ReportSources({
  ids,
  sources,
  onSource,
}: {
  ids: string[];
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  const visibleSources = sources
    .map((source, index) => ({source, index}))
    .filter(({source}) => source.kind === 'sec' && ids.includes(source.id));

  if (!visibleSources.length) return null;

  return (
    <View style={styles.sourceRow}>
      {visibleSources.map(({source, index}) => (
        <Pressable
          key={source.id}
          accessibilityRole="button"
          accessibilityLabel={`View source ${index + 1}: ${source.label}`}
          onPress={() => onSource(source)}
          style={styles.sourceButton}
        >
          <Text style={styles.sourceText}>
            [{index + 1}] {source.label}
          </Text>
        </Pressable>
      ))}
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
            {expanded
              ? 'Show less'
              : long
                ? 'Read full excerpt'
                : 'Read source context'}
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

      <ReportSources
        ids={item.sourceIds}
        sources={sources}
        onSource={onSource}
      />
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

      <ReportSources
        ids={table.sourceIds}
        sources={sources}
        onSource={onSource}
      />
    </View>
  );
}

export function ReportEvidenceSection({
  section,
  sources,
  onSource,
}: {
  section: ReportSection;
  sources: ReportSource[];
  onSource: (source: ReportSource) => void;
}) {
  const [open, setOpen] = useState(false);
  const available =
    section.statements.some((item) => item.text.trim()) ||
    section.tables.some((table) => table.rows.length > 0);

  if (!available) return null;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        accessibilityLabel={`${section.title}, available`}
        onPress={() => setOpen(!open)}
        style={styles.sectionHeader}
      >
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.small}>
            {section.statements.length + section.tables.length} report items
          </Text>
        </View>

        <Text style={styles.expand}>{open ? '−' : '+'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.sectionContent}>
          <Text style={styles.description}>{section.description}</Text>

          {section.statements.map((item) => (
            <Statement
              key={item.id}
              item={item}
              sources={sources}
              onSource={onSource}
            />
          ))}

          {section.tables.map((table, index) => (
            <DataTable
              key={index}
              table={table}
              sources={sources}
              onSource={onSource}
            />
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

const styles = StyleSheet.create({
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
});
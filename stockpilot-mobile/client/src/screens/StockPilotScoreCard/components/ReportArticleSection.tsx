import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {
  CompanyReport,
  ReportArticleSection as ArticleSection,
  ReportParagraph,
  ReportSource,
} from '../types/companyReport';
import {ReportChart} from './ReportChart';
import {ReportEvidenceSection, ReportSources} from './ReportEvidence';

type Props = {
  section: ArticleSection;
  report: CompanyReport;
  onSource: (source: ReportSource) => void;
};

function Paragraph({item}: {item: ReportParagraph}) {
  const [expanded, setExpanded] = useState(false);
  const disclosure = item.kind === 'disclosure';
  const long = disclosure && item.text.length > 700;
  const label =
    item.kind === 'forecast'
      ? 'Analyst expectation'
      : item.kind === 'model'
        ? 'StockPilot analysis'
        : disclosure
          ? 'Company disclosure'
          : null;

  return (
    <View style={[styles.paragraph, disclosure && styles.disclosure]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Text
        selectable
        numberOfLines={long && !expanded ? 7 : undefined}
        style={[styles.body, item.kind === 'explanation' && styles.explanation]}
      >
        {item.text}
      </Text>

      {long ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{expanded}}
          onPress={() => setExpanded(!expanded)}
          style={styles.toggle}
        >
          <Text style={styles.link}>
            {expanded ? 'Show less' : 'Read the complete disclosure'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ReportArticleSection({section, report, onSource}: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (section.id === 'sec-businessProfile') {
    return null;
  }

  const evidence = report.sections.filter(
    (item) =>
      section.evidenceIds.includes(item.id) &&
      (item.statements.length || item.tables.length),
  );

  const paragraphs = section.paragraphs.filter((item) => item.text.trim());

  const charts = section.charts
    .map((chart) => ({
      ...chart,
      points: chart.points.filter((point) => Number.isFinite(point.value)),
    }))
    .filter((chart) => chart.points.length >= 2);

  const hasAnalysis = paragraphs.some(
    (item) =>
      item.kind !== 'explanation' &&
      item.sourceIds.some((id) =>
        report.sources.some((source) => source.id === id),
      ),
  );

  const hasDisclosure =
    section.id.startsWith('sec-') && evidence.length > 0;

  if (!hasAnalysis && !charts.length && !hasDisclosure) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {section.title}
      </Text>

      {paragraphs.map((item) => (
        <View key={item.id}>
          <Paragraph item={item} />

          {item.sourceIds.length ? (
            <ReportSources
              ids={item.sourceIds}
              sources={report.sources}
              onSource={onSource}
            />
          ) : null}
        </View>
      ))}

      {charts.map((chart) => (
        <View key={chart.id}>
          <ReportChart chart={chart} />

          <ReportSources
            ids={[...new Set(chart.points.flatMap((point) => point.sourceIds))]}
            sources={report.sources}
            onSource={onSource}
          />
        </View>
      ))}

      {evidence.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${
            showEvidence ? 'Hide' : 'Show'
          } supporting evidence for ${section.title}`}
          accessibilityState={{expanded: showEvidence}}
          onPress={() => setShowEvidence(!showEvidence)}
          style={styles.toggle}
        >
          <Text style={styles.link}>
            {showEvidence
              ? 'Hide supporting evidence'
              : 'Explore supporting evidence'}{' '}
            {showEvidence ? '−' : '+'}
          </Text>
        </Pressable>
      ) : null}

      {showEvidence
        ? evidence.map((item) => (
            <ReportEvidenceSection
              key={item.id}
              section={item}
              sources={report.sources}
              onSource={onSource}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E8E2',
    gap: 13,
  },
  heading: {
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '700',
    color: '#153D2C',
    marginBottom: 3,
  },
  paragraph: {
    gap: 7,
  },
  disclosure: {
    borderLeftWidth: 3,
    borderLeftColor: '#B8D9C7',
    paddingLeft: 13,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#65796C',
  },
  body: {
    fontSize: 15,
    lineHeight: 25,
    color: '#263B30',
  },
  explanation: {
    color: '#5B7063',
    fontSize: 14,
    lineHeight: 23,
  },
  toggle: {
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
});
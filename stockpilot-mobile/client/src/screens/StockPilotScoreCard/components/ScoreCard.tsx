import {ScoreEvidence} from './ScoreEvidence';
import type {ScoreConfidence} from '../../stocks/useStockIntelligence';
import {StyleSheet, Text, View} from 'react-native';
import {getScoreCardDefinition, type ScoreLanguage} from '../domain/scoreCardDefinitions';

export type ScoreCardItem = {
  id: string;
  score: number | null;
  coverage?: number;
  confidence?: ScoreConfidence;
  eligible?: boolean;
  reasons?: string[];
  direction?: 'higher_is_better' | 'higher_is_riskier';
};

type Props = {item: ScoreCardItem; language?: ScoreLanguage; width?: number};
function getScoreColor(
  score: number | null,
  direction: 'higher_is_better' | 'higher_is_riskier' = 'higher_is_better',
) {
  if (score === null) {
    return '#7788A3';
  }
  if (direction === 'higher_is_riskier') {
    if (score <= 3) {
      return '#079B73';
    }
    if (score <= 6) {
      return '#D99420';
    }
    return '#E15858';
  }
  if (score >= 7) {
    return '#079B73';
  }
  if (score >= 4) {
    return '#D99420';
  }
  return '#E15858';
}
function getScoreBackground(
  score: number | null,
  direction: 'higher_is_better' | 'higher_is_riskier' = 'higher_is_better',
) {
  if (score === null) {
    return '#F4F7FA';
  }
  if (direction === 'higher_is_riskier') {
    if (score <= 3) {
      return '#E9F8F1';
    }
    if (score <= 6) {
      return '#FFF4DE';
    }
    return '#FDECEC';
  }
  if (score >= 7) {
    return '#E9F8F1';
  }
  if (score >= 4) {
    return '#FFF4DE';
  }
  return '#FDECEC';
}
function getScoreLabel(
  score: number | null,
  direction: 'higher_is_better' | 'higher_is_riskier' = 'higher_is_better',
  language: ScoreLanguage,
) {
  if (score === null) {
    return language === 'es' ? 'Sin valorar' : 'Not rated';
  }
  if (direction === 'higher_is_riskier') {
    if (score <= 3) {
      return language === 'es' ? 'Bajo' : 'Low';
    }
    if (score <= 6) {
      return language === 'es' ? 'Moderado' : 'Moderate';
    }
    return language === 'es' ? 'Alto' : 'High';
  }
  if (score >= 8) {
    return language === 'es' ? 'Excelente' : 'Excellent';
  }
  if (score >= 7) {
    return language === 'es' ? 'Fuerte' : 'Strong';
  }
  if (score >= 5) {
    return language === 'es' ? 'Equilibrado' : 'Balanced';
  }
  if (score >= 3) {
    return language === 'es' ? 'Débil' : 'Weak';
  }
  return language === 'es' ? 'Muy débil' : 'Very weak';
}
function formatScore(score: number | null) {
  if (score === null) {
    return 'N/A';
  }
  if (Number.isInteger(score)) {
    return String(score);
  }
  return score.toFixed(1);
}
export function ScoreCard({item, language = 'en', width}: Props) {
  const definition = getScoreCardDefinition(item.id, language);
  const color = getScoreColor(item.score, item.direction);
  const backgroundColor = getScoreBackground(item.score, item.direction);
  return (
    <View style={[styles.card, width ? {width} : null]}>
      <Text style={styles.title} numberOfLines={1}>
        {definition.title}
      </Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, {color}]}>{formatScore(item.score)}</Text>
        {item.score !== null ? <Text style={styles.scoreMax}>/10</Text> : null}
      </View>
      <View style={[styles.badge, {backgroundColor}]}>
        <Text style={[styles.badgeText, {color}]}>
          {getScoreLabel(item.score, item.direction, language)}
        </Text>
      </View>
      <ScoreEvidence item={item} language={language} />
      <Text style={styles.subtitle} numberOfLines={2}>
        {definition.subtitle}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    minHeight: 150,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE9E6',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  title: {fontSize: 14, fontWeight: '700', color: '#71819B'},
  scoreRow: {marginTop: 8, flexDirection: 'row', alignItems: 'baseline'},
  score: {fontSize: 36, lineHeight: 41, fontWeight: '700'},
  scoreMax: {marginLeft: 3, fontSize: 16, fontWeight: '600', color: '#071B43'},
  badge: {
    marginTop: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {fontSize: 11, fontWeight: '700'},
  subtitle: {marginTop: 9, fontSize: 12, lineHeight: 17, color: '#7788A3'},
});

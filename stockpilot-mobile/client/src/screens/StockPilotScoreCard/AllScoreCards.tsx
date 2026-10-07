import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HomeStackParamList} from '../../';
import {ScreenHeader} from '../components/ScreenHeader';
import {ScoreEvidence} from './components/ScoreEvidence';
import type {ScoreCardItem} from './components/ScoreCardsSection';
import {getScoreCardDefinition, type ScoreLanguage} from './domain/scoreCardDefinitions';

type StandaloneProps = {
  embedded?: false;
  route: {params: HomeStackParamList['AllScoreCards']};
  navigation: {goBack: () => void};
};

type EmbeddedProps = {
  embedded: true;
  scores: ScoreCardItem[];
};

type Props = StandaloneProps | EmbeddedProps;

const LANGUAGE: ScoreLanguage = 'en';

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

function getScoreLabel(item: ScoreCardItem, language: ScoreLanguage) {
  if (item.score === null) {
    return language === 'es' ? 'Sin valorar' : 'Not rated';
  }

  if (item.direction === 'higher_is_riskier') {
    if (item.score <= 3) {
      return language === 'es' ? 'Bajo' : 'Low';
    }

    if (item.score <= 6) {
      return language === 'es' ? 'Moderado' : 'Moderate';
    }

    return language === 'es' ? 'Alto' : 'High';
  }

  if (item.score >= 8) {
    return language === 'es' ? 'Excelente' : 'Excellent';
  }

  if (item.score >= 7) {
    return language === 'es' ? 'Fuerte' : 'Strong';
  }

  if (item.score >= 5) {
    return language === 'es' ? 'Equilibrado' : 'Balanced';
  }

  if (item.score >= 3) {
    return language === 'es' ? 'Débil' : 'Weak';
  }

  return language === 'es' ? 'Muy débil' : 'Very weak';
}

function formatScore(score: number | null) {
  if (score === null) {
    return 'N/A';
  }

  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function ScoreCard({item, language}: {item: ScoreCardItem; language: ScoreLanguage}) {
  const definition = getScoreCardDefinition(item.id, language);
  const color = getScoreColor(item.score, item.direction);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{definition.title}</Text>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, {color}]}>{formatScore(item.score)}</Text>

        {item.score !== null ? <Text style={styles.scoreMax}>/10</Text> : null}
      </View>

      <Text style={[styles.status, {color}]}>{getScoreLabel(item, language)}</Text>

      <ScoreEvidence item={item} language={language} />

      <Text style={styles.subtitle}>{definition.subtitle}</Text>

      <View style={styles.divider} />

      <Text style={styles.infoText}>{definition.whatWeLookFor}</Text>
    </View>
  );
}

function ScoresContent({scores}: {scores: ScoreCardItem[]}) {
  const visibleScores = scores.filter(
    (item) => typeof item.score === 'number' && Number.isFinite(item.score),
  );

  const language = LANGUAGE;

  return (
    <View style={styles.content}>
      <Text style={styles.description}>
        {language === 'es'
          ? 'Una visión completa de las principales señales de la acción.'
          : "A complete view of the stock's key signals."}
      </Text>

      <View style={styles.grid}>
        {visibleScores.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            <ScoreCard item={item} language={language} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AllScoreCards(props: Props) {
  if (props.embedded) {
    return <ScoresContent scores={props.scores} />;
  }

  const {scores} = props.route.params;
  const language = LANGUAGE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title={language === 'es' ? 'Todas las Puntuaciones' : 'All Scores'}
        subtitle="Discover our algorithm based Scores"
        onBack={() => props.navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScoresContent scores={scores} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FCFB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  content: {
    paddingTop: 18,
  },
  description: {
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    color: '#71819B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    alignItems: 'stretch',
  },
  gridItem: {
    width: '48.3%',
    alignSelf: 'stretch',
  },
  card: {
    flex: 1,
    minHeight: 245,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE9E6',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    minHeight: 38,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#71819B',
  },
  scoreRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  scoreMax: {
    marginLeft: 3,
    fontSize: 16,
    fontWeight: '600',
    color: '#071B43',
  },
  status: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 17,
    color: '#7788A3',
  },
  divider: {
    marginVertical: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5ECEA',
  },
  infoText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: '#71819B',
  },
});

import {StyleSheet, Text, View} from 'react-native';
import type {ListAlgorithm, ListSection} from '../types/SmartList';
import {AlgorithmButton} from './AlgorithmButton';

type Props = {
  section: ListSection;
  activeAlgorithmId: ListAlgorithm['id'] | null;
  availableAlgorithmIds: Set<ListAlgorithm['id']>;
  onPress: (algorithm: ListAlgorithm) => void;
};

export function SmartListSection({
  section,
  activeAlgorithmId,
  availableAlgorithmIds,
  onPress,
}: Props) {
  const availableAlgorithms = section.algorithms.filter((algorithm) =>
    availableAlgorithmIds.has(algorithm.id),
  );

  if (availableAlgorithms.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{section.title}</Text>

      <View style={styles.grid}>
        {availableAlgorithms.map((algorithm, index) => {
          const isLastOddItem =
            availableAlgorithms.length % 2 !== 0 && index === availableAlgorithms.length - 1;

          return (
            <View
              key={algorithm.id}
              style={[styles.buttonContainer, isLastOddItem && styles.fullWidth]}
            >
              <AlgorithmButton
                title={algorithm.title}
                active={algorithm.id === activeAlgorithmId}
                onPress={() => onPress(algorithm)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F8F8',
  },
  title: {
    marginBottom: 10,
    color: '#062451',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    rowGap: 8,
  },
  buttonContainer: {
    width: '50%',
    paddingHorizontal: 4,
  },
  fullWidth: {
    width: '100%',
  },
});

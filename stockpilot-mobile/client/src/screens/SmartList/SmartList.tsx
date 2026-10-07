import {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HomeStackParamList} from '../..';
import {ScreenHeader} from '../components/ScreenHeader';
import {SmartListSection} from './components/SmartListSection';
import {listSections} from './data/smartListAlgorithms';
import {useAvailableSmartLists} from './hooks/useAvailableSmartLists';
import type {ListAlgorithm} from './types/SmartList';

type Navigation = NativeStackNavigationProp<HomeStackParamList>;

export default function SmartList() {
  const navigation = useNavigation<Navigation>();

  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<ListAlgorithm['id'] | null>(null);

  const {availableAlgorithmIds, loading} = useAvailableSmartLists();

  const handleAlgorithmPress = (algorithm: ListAlgorithm) => {
    setSelectedAlgorithmId(algorithm.id);

    navigation.navigate('FeaturedPicksList', {
      algorithm: algorithm.id,
      title: algorithm.title,
      subtitle: algorithm.description,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Smart Lists"
        subtitle="Discover stocks using our algorithms"
        onBack={navigation.goBack}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!loading
          ? listSections.map((section) => (
              <SmartListSection
                key={section.id}
                section={section}
                activeAlgorithmId={selectedAlgorithmId}
                availableAlgorithmIds={availableAlgorithmIds}
                onPress={handleAlgorithmPress}
              />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
});

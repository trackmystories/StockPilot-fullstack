import {useState} from 'react';
import {FlatList, StyleSheet, Pressable, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenHeader} from '../components/ScreenHeader';
import type {NewsStackParamList} from '../../';
import NewsCard from './components/NewsCard';
import {Button, Feedback} from './components/NewsUI';
import {useNewsList} from './hooks/useNews';

const ITEMS_PER_PAGE = 3;

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsFeed'>;

export default function NewsScreen({navigation}: Props) {
  const list = useNewsList();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const visibleItems = list.items.slice(0, visibleCount);
  const hasHiddenLoadedItems = visibleCount < list.items.length;
  const canShowMore = hasHiddenLoadedItems || list.hasMore;

  const handleShowMore = async () => {
    const nextVisibleCount = visibleCount + ITEMS_PER_PAGE;

    if (nextVisibleCount > list.items.length && list.hasMore) {
      await list.loadMore();
    }

    setVisibleCount(nextVisibleCount);
  };

  const handleRefresh = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    void list.refresh();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title="Articles"
          subtitle="Research, perspectives & engineering"
          onBack={() => navigation.goBack()}
        />

        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          refreshing={list.loading}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <Feedback error={list.error} />

              {!!list.error && (
                <View style={styles.retry}>
                  <Button title="Retry" onPress={() => void list.refresh()} />
                </View>
              )}
            </>
          }
          renderItem={({item}) => (
            <NewsCard
              article={item}
              onPress={() =>
                navigation.navigate('NewsArticle', {
                  articleId: item.id,
                })
              }
            />
          )}
          ListEmptyComponent={
            !list.loading && !list.error ? (
              <Text style={styles.emptyText}>No articles published yet.</Text>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Feedback loading={list.loading} />

              {canShowMore && (
                <Button
                  title="Show more"
                  disabled={list.loading}
                  onPress={() => void handleShowMore()}
                />
              )}
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  retry: {
    marginBottom: 12,
  },
  emptyText: {
    marginTop: 30,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#71819B',
    textAlign: 'center',
  },
  footer: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
});

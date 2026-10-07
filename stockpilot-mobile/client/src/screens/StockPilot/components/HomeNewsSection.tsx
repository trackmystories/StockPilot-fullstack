import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import NewsCard from '../../News/components/NewsCard';
import {Button, Feedback} from '../../News/components/NewsUI';
import {useNewsList} from '../../News/hooks/useNews';

type Props = {
  onArticlePress: (articleId: string) => void;
};

const ITEMS_PER_PAGE = 3;

export function HomeNewsSection({onArticlePress}: Props) {
  const list = useNewsList();

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const visibleArticles = list.items.slice(0, visibleCount);

  const hasLocalMore = visibleCount < list.items.length;

  const handleLoadMore = async () => {
    const nextVisibleCount = visibleCount + ITEMS_PER_PAGE;

    if (nextVisibleCount > list.items.length && list.hasMore) {
      await list.loadMore();
    }

    setVisibleCount(nextVisibleCount);
  };

  const canLoadMore = hasLocalMore || list.hasMore;

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Latest posts</Text>
        <Text style={styles.subtitle}>Stay updated with our latest stock analysis</Text>
      </View>

      <Feedback error={list.error} />

      {!!list.error && <Button title="Retry" onPress={list.refresh} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <Text style={styles.empty}>No articles published yet.</Text>
      )}

      <View style={styles.articles}>
        {visibleArticles.map((article) => (
          <NewsCard key={article.id} article={article} onPress={() => onArticlePress(article.id)} />
        ))}
      </View>

      {list.loading && list.items.length === 0 && <Feedback loading />}

      {canLoadMore && (
        <View style={styles.loadMore}>
          <Button title="Load more" disabled={list.loading} onPress={handleLoadMore} />
        </View>
      )}

      {list.loading && list.items.length > 0 && <Feedback loading />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 36,
    gap: 18,
  },

  heading: {
    gap: 4,
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#062653',
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#7890B3',
  },

  articles: {
    gap: 14,
  },

  loadMore: {
    marginTop: 2,
  },

  empty: {
    fontSize: 14,
    color: '#7890B3',
  },
});

import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {ArticleSummary} from '../domain/News';
import {colors} from './NewsUI';

function age(date: string | null) {
  if (!date) {
    return 'Draft';
  }

  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 60000));

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  return new Date(date).toLocaleDateString();
}

function getBadgeLabel(article: ArticleSummary) {
  const ticker = article.ticker?.trim();

  if (ticker) {
    return ticker.toUpperCase();
  }

  return article.category;
}

function estimateReadTime(article: ArticleSummary) {
  const text = `${article.title} ${article.excerpt ?? ''}`.trim();

  const words = text.split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 40));
}

export default function NewsCard({
  article,
  onPress,
}: {
  article: ArticleSummary;
  onPress: () => void;
}) {
  const badgeLabel = getBadgeLabel(article);

  const readTime = estimateReadTime(article);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={article.title}
      style={({pressed}) => [s.card, pressed && s.cardPressed]}
    >
      <View style={s.topRow}>
        <Text style={s.category}>{article.category.toUpperCase()}</Text>

        <View style={s.badge}>
          <Text numberOfLines={1} style={s.badgeText}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      <Text numberOfLines={3} style={s.title}>
        {article.title}
      </Text>

      {article.excerpt ? (
        <Text numberOfLines={3} style={s.excerpt}>
          {article.excerpt}
        </Text>
      ) : null}

      <View style={s.footer}>
        <View style={s.metadata}>
          <Text style={s.time}>{age(article.publishedAt)}</Text>

          <Text style={s.separator}>•</Text>

          <Text style={s.time}>{readTime} min read</Text>
        </View>

        <Ionicons name="arrow-forward" size={21} color="#062653" />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E3EAF2',
  },

  cardPressed: {
    opacity: 0.72,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  category: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#8294B1',
  },

  badge: {
    maxWidth: 130,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#E8F8F2',
  },

  badgeText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  title: {
    marginTop: 12,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.text,
  },

  excerpt: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },

  footer: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  time: {
    fontSize: 12,
    color: '#8294B1',
  },

  separator: {
    fontSize: 12,
    color: '#B1BDCD',
  },
});

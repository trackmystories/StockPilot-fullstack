import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useMemo, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NewsStackParamList} from '../../';
import {useAppSelector} from '../store/hooks';
import {Button, errorMessage, Feedback, Page} from './components/NewsUI';
import type {Article, ArticleImage} from './domain/News';
import {newsService} from './newsDependencies';
type Props = {
  route: {params: NewsStackParamList['NewsArticle']};
  navigation: {goBack: () => void};
};
type ArticleBlock =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'image';
      imageKey: string;
    };
function parseArticleBody(body: string): ArticleBlock[] {
  const imagePattern = /\[\[IMAGE:([a-zA-Z0-9-_]+)\]\]/g;
  const blocks: ArticleBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = imagePattern.exec(body)) !== null) {
    const textBeforeImage = body.slice(lastIndex, match.index).trim();
    if (textBeforeImage) {
      blocks.push({
        type: 'text',
        content: textBeforeImage,
      });
    }
    blocks.push({
      type: 'image',
      imageKey: match[1],
    });
    lastIndex = match.index + match[0].length;
  }
  const remainingText = body.slice(lastIndex).trim();
  if (remainingText) {
    blocks.push({
      type: 'text',
      content: remainingText,
    });
  }
  return blocks;
}
function isSectionHeading(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.length > 90) {
    return false;
  }
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (!letters) {
    return false;
  }
  return letters === letters.toUpperCase();
}
function isBullet(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('•') || trimmed.startsWith('- ');
}
function isQuote(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('"') && trimmed.endsWith('"');
}
function ArticleTextBlock({content}: {content: string}) {
  const paragraphs = useMemo(
    () =>
      content
        .replace(/\u00A0/g, ' ')
        .replace(/\u202F/g, ' ')
        .replace(/\u2007/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean),
    [content],
  );
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        if (isSectionHeading(paragraph)) {
          return (
            <Text key={`${paragraph}-${index}`} style={articleStyles.sectionHeading}>
              {paragraph}
            </Text>
          );
        }
        if (isBullet(paragraph)) {
          return (
            <Text key={`${paragraph}-${index}`} selectable style={articleStyles.bulletText}>
              {paragraph}
            </Text>
          );
        }
        if (isQuote(paragraph)) {
          return (
            <View key={`${paragraph}-${index}`} style={articleStyles.quoteContainer}>
              <Text selectable style={articleStyles.quoteText}>
                {paragraph}
              </Text>
            </View>
          );
        }
        return (
          <View key={`${paragraph}-${index}`} style={articleStyles.paragraphContainer}>
            <Text selectable style={articleStyles.paragraph}>
              {paragraph}
            </Text>
          </View>
        );
      })}
    </>
  );
}
function ArticleDiagram({image, imageKey}: {image?: ArticleImage; imageKey: string}) {
  const [loadedRatio, setLoadedRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const hasDimensions =
    typeof image?.width === 'number' &&
    Number.isFinite(image.width) &&
    image.width > 0 &&
    typeof image?.height === 'number' &&
    Number.isFinite(image.height) &&
    image.height > 0;
  const aspectRatio = hasDimensions ? image!.width! / image!.height! : (loadedRatio ?? 1.78);
  const url = image?.url?.trim();
  if (!url || failed) {
    return null;
  }
  return (
    <View style={articleStyles.diagramContainer}>
      <Image
        source={{uri: url}}
        style={[articleStyles.diagram, {aspectRatio}]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel={image?.alt || imageKey.replace(/-/g, ' ')}
        onLoad={({nativeEvent}) => {
          const {width, height} = nativeEvent.source;
          if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
            setLoadedRatio(width / height);
          }
        }}
        onError={() => setFailed(true)}
      />
      {!!image?.caption && <Text style={articleStyles.caption}>{image.caption}</Text>}
    </View>
  );
}
export default function NewsArticleScreen({route, navigation}: Props) {
  const token = useAppSelector((state) => state.auth.token) ?? '';
  const id = route.params.articleId;
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      setArticle(null);
      newsService
        .get(token, id)
        .then((value) => {
          if (active) {
            setArticle(value);
          }
        })
        .catch((error) => {
          if (active) {
            setError(errorMessage(error));
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, [token, id, retry]),
  );
  const bodyBlocks = useMemo(() => (article ? parseArticleBody(article.body) : []), [article]);
  return (
    <Page>
      <Feedback loading={loading} error={error} />
      {!!error && <Button title="Retry" onPress={() => setRetry((value) => value + 1)} />}
      {article && (
        <SafeAreaView style={articleStyles.container}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={articleStyles.backButton}
          >
            <Ionicons name="chevron-back" size={30} color="#062653" />
          </Pressable>
          <View style={articleStyles.header}>
            <Text style={articleStyles.category}>{article.category}</Text>
            <Text style={articleStyles.title}>{article.title}</Text>
            <Text style={articleStyles.meta}>
              By {article.authorName}
              {' · '}
              {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Draft'}
            </Text>
          </View>
          {!!article.coverImageUrl && (
            <Image
              source={{uri: article.coverImageUrl}}
              style={articleStyles.coverImage}
              resizeMode="cover"
            />
          )}
          {!!article.excerpt && (
            <Text selectable style={articleStyles.excerpt}>
              {article.excerpt}
            </Text>
          )}
          <View style={articleStyles.articleBody}>
            {bodyBlocks.map((block, index) => {
              if (block.type === 'image') {
                return (
                  <ArticleDiagram
                    key={`${article.id}-${block.imageKey}-${index}-${article.images?.[block.imageKey]?.url ?? ''}`}
                    imageKey={block.imageKey}
                    image={article.images?.[block.imageKey]}
                  />
                );
              }
              return <ArticleTextBlock key={`text-${index}`} content={block.content} />;
            })}
          </View>
        </SafeAreaView>
      )}
    </Page>
  );
}
const articleStyles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    overflow: 'hidden',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  header: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    marginBottom: 24,
  },
  category: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#66758D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#062653',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: 14,
  },
  meta: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#77869B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  coverImage: {
    width: '100%',
    maxWidth: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 28,
    backgroundColor: '#F3F5F7',
  },
  excerpt: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#253C5E',
    fontSize: 19,
    lineHeight: 29,
    fontWeight: '600',
    marginBottom: 32,
  },
  articleBody: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  paragraphContainer: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  paragraph: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#102D57',
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '400',
    letterSpacing: -0.1,
    marginBottom: 24,
  },
  bulletText: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#102D57',
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '400',
    paddingLeft: 4,
    marginBottom: 8,
  },
  sectionHeading: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#062653',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginTop: 26,
    marginBottom: 18,
  },
  quoteContainer: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#062653',
    paddingLeft: 18,
    paddingRight: 4,
    marginTop: 4,
    marginBottom: 26,
  },
  quoteText: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    color: '#344E70',
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  diagramContainer: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 34,
  },
  caption: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#66758D',
    textAlign: 'center',
  },
  diagram: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
});

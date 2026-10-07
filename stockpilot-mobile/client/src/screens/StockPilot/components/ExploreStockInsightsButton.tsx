import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

type Props = {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon?: 'stock-activity' | 'smart-lists' | 'articles';
  width?: number;
};

export function ExploreStockInsightsButton({
  title,
  subtitle,
  onPress,
  icon = 'stock-activity',
  width,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({pressed}) => [
        styles.container,
        width ? {width} : null,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.arrowButton}>
        <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingLeft: 16,
    paddingRight: 14,

    borderRadius: 10,
    borderColor: '#D4E6DF',
    backgroundColor: '#FFFFFF',

    overflow: 'hidden',

    shadowColor: '#00A86B',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,

    elevation: 3,
  },

  containerPressed: {
    opacity: 0.9,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  activityArrows: {
    position: 'absolute',
    right: 5,
    top: 4,
    gap: -5,
  },

  copy: {
    flex: 1,

    paddingRight: 10,
  },

  title: {
    color: '#08A66D',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,

    marginBottom: 5,
  },

  subtitle: {
    color: '#7184A1',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
  },

  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 24,
    backgroundColor: '#08A66D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#08A66D',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,

    elevation: 4,
  },
});

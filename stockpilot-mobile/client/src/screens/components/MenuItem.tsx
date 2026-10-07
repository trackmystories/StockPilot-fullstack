import {Ionicons} from '@expo/vector-icons';

import {Pressable, StyleSheet, Text, View} from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon: IconName;

  title: string;

  subtitle?: string;

  onPress?: () => void;

  iconColor?: string;

  iconBackgroundColor?: string;

  titleColor?: string;

  subtitleColor?: string;

  chevronColor?: string;

  showChevron?: boolean;
};

export default function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  iconColor = '#05A978',
  iconBackgroundColor = '#E9F8F3',
  titleColor = '#062653',
  subtitleColor = '#05A978',
  chevronColor = '#7A8EAB',
  showChevron = true,
}: Props) {
  return (
    <Pressable
      style={({pressed}) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: iconBackgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: titleColor,
            },
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: subtitleColor,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showChevron ? <Ionicons name="chevron-forward" size={22} color={chevronColor} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 88,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },

  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: 800,
  },

  subtitle: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});

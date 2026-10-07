import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IconName;

  iconColor: string;

  iconBackgroundColor: string;

  title: string;

  subtitle: string;

  badge?: string;

  badgeColor?: string;

  badgeBackgroundColor?: string;

  danger?: boolean;

  onPress: () => void;
};

export default function SecurityRow({
  icon,
  iconColor,
  iconBackgroundColor,
  title,
  subtitle,
  badge,
  badgeColor = '#536780',
  badgeBackgroundColor = '#EEF2F6',
  danger = false,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.container, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: iconBackgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={27} color={iconColor} />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, danger && styles.dangerTitle]}>{title}</Text>

        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {!!badge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeBackgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: badgeColor,
              },
            ]}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 104,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,
    paddingVertical: 16,

    gap: 14,

    borderWidth: 1,
    borderColor: '#E0E8F1',

    borderRadius: 20,

    backgroundColor: '#FFFFFF',
  },

  pressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 58,
    height: 58,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },

  copy: {
    flex: 1,

    gap: 4,
  },

  title: {
    fontSize: 17,
    fontWeight: '700',

    color: '#062653',
  },

  dangerTitle: {
    color: '#E32626',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,

    color: '#7A8EAB',
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,

    borderRadius: 14,
  },

  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

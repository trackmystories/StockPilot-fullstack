import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IconName;
  iconColor: string;
  iconBackgroundColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function LegalMenuCard({
  icon,
  iconColor,
  iconBackgroundColor,
  title,
  subtitle,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.iconContainer, {backgroundColor: iconBackgroundColor}]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={24} color="#71849D" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E0E8F1',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },

  pressed: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 64,
    height: 64,
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

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A8EAB',
  },
});

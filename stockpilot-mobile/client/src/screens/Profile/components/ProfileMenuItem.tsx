import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
type Tone = 'green' | 'amber' | 'rose';
type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  tone?: Tone;
  onPress?: () => void;
};
const tones = {
  green: {background: '#E5F7F0', foreground: '#00AE7B'},
  amber: {background: '#FFF3DF', foreground: '#EF9A09'},
  rose: {background: '#FDE7ED', foreground: '#F04465'},
};
export default function ProfileMenuItem({icon, title, subtitle, tone = 'green', onPress}: Props) {
  const colors = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      disabled={!onPress}
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.icon, {backgroundColor: colors.background}]}>
        <Ionicons name={icon} size={25} color={colors.foreground} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={19} color="#8190A8" />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5EBF2',
    backgroundColor: '#FFFFFF',
    shadowColor: '#233653',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  pressed: {backgroundColor: '#F0F8F5', opacity: 0.85},
  icon: {width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  content: {flex: 1, minWidth: 0},
  title: {fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#071B43'},
  subtitle: {marginTop: 4, fontSize: 12, lineHeight: 18, color: '#7B8BA5'},
});

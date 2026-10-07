import type {ComponentProps} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
type Props = {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};
export function ActionButton({title, icon, iconSize = 20, onPress, style}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({pressed}) => [styles.button, style, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={iconSize} color="#079B73" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#079B73',
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F8F2',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

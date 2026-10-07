import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

type Props = {
  size?: number;
  color?: string;
  backgroundColor?: string;
};

export function AddToPortfolioIcon({
  size = 21,
  color = '#079B73',
  backgroundColor = '#FFFFFF',
}: Props) {
  const badgeSize = Math.max(11, Math.round(size * 0.55));

  return (
    <View
      style={[styles.icon, { width: size + 4, height: size + 4 }]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name="briefcase-outline" size={size} color={color} />
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            borderColor: backgroundColor,
            backgroundColor: color,
          },
        ]}
      >
        <Ionicons name="add" size={badgeSize - 2} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

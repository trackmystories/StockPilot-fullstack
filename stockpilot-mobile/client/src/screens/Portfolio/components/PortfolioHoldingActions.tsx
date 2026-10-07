import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HoldingAction } from '../domain/holdingManagement';
import type { PortfolioHolding } from '../domain/portfolio';

type Props = {
  holding: PortfolioHolding;
  onSelect: (action: HoldingAction) => void;
  onClose: () => void;
};

const ACTIONS = [
  { id: 'buy', title: 'Buy more', subtitle: 'Add more shares to this portfolio', icon: 'add-circle', color: '#079B73', background: '#EAF8F2' },
  { id: 'sell', title: 'Sell', subtitle: 'Record shares you sold', icon: 'trending-down', color: '#D99420', background: '#FFF7E8' },
  { id: 'remove', title: 'Remove', subtitle: 'Remove an incorrect entry', icon: 'trash-outline', color: '#D9534F', background: '#FDEFF0' },
] as const;

export function PortfolioHoldingActions({ holding, onSelect, onClose }: Props) {
  const selected = useRef(false);
  const { symbol, currency } = holding.instrument;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const choose = (action: HoldingAction) => {
    if (selected.current) return;
    selected.current = true;
    onSelect(action);
  };

  return (
    <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <TouchableOpacity
        testID="holding-actions-backdrop"
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessible={false}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} accessible={false} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">Manage holding</Text>
            <Text style={styles.subtitle}>{symbol} · {holding.quantity} shares · {currency}</Text>
          </View>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.action}
              activeOpacity={0.7}
              onPress={() => choose(action.id)}
              accessibilityRole="button"
              accessibilityLabel={action.id === 'buy' ? `Buy more ${symbol}` : action.id === 'sell' ? `Record sale of ${symbol}` : `Remove an incorrect ${symbol} entry`}
            >
              <View style={[styles.icon, { backgroundColor: action.background }]}>
                <Ionicons name={action.icon} size={26} color={action.color} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#7788A3" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.cancel}
          activeOpacity={0.7}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel holding actions"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 20,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 27, 58, 0.30)',
  },

  sheet: {
    maxHeight: '86%',
    paddingTop: 10,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4DCE5',
    alignSelf: 'center',
    marginBottom: 8,
  },

  scroll: {
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  heading: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 5,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#081B3A',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7788A3',
  },

  action: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E4EBF0',
    borderRadius: 12,
  },

  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#081B3A',
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7788A3',
  },

  cancel: {
    minHeight: 44,
    marginHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F4F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7788A3',
  },
});

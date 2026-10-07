import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Feedback, Field, PortfolioScreen, s } from './components/PortfolioUI';
import { PORTFOLIO_CURRENCIES, type PortfolioCurrency } from './domain/portfolio';
import type { PortfolioStackParamList } from './domain/navigation';
import { usePortfolioAction } from './hooks/usePortfolioAction';
import { usePortfolioResource } from './hooks/usePortfolioResource';
import { portfolioRepository } from './infrastructure/HttpPortfolioRepository';

type Props = NativeStackScreenProps<PortfolioStackParamList, 'PortfolioSettings'>;

export default function PortfolioSettings({ navigation, route }: Props) {
  const { portfolioId } = route.params;
  const load = useCallback((signal: AbortSignal) => portfolioRepository.settings(portfolioId, signal), [portfolioId]);
  const resource = usePortfolioResource(load, portfolioId);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<PortfolioCurrency>('USD');
  const [operation, setOperation] = useState<'save' | 'archive' | 'delete' | null>(null);
  const action = usePortfolioAction();
  const deleting = resource.data?.deleting === true;

  useEffect(() => {
    if (resource.data) {
      setName(resource.data.name);
      setCurrency(resource.data.currency);
    }
  }, [resource.data]);

  const returnToPortfolios = () => navigation.reset({ index: 0, routes: [{ name: 'PortfoliosHome' }] });

  const save = () => {
    if (!resource.data || !name.trim() || action.pending || deleting) return;
    setOperation('save');
    void action.run(
      `settings-${portfolioId}-${name.trim()}-${currency}`,
      () => portfolioRepository.update(portfolioId, { name: name.trim(), currency }),
      () => navigation.goBack(),
    );
  };

  const archive = () => {
    if (!resource.data || action.pending || deleting) return;
    const archived = !resource.data.archived;
    Alert.alert(
      archived ? 'Archive portfolio?' : 'Restore portfolio?',
      archived ? 'This hides the portfolio from your active list. Your holdings and activity are kept.' : 'This portfolio will appear in your active list again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: archived ? 'Archive' : 'Restore',
          onPress: () => {
            setOperation('archive');
            void action.run(`archive-${portfolioId}-${archived}`, () => portfolioRepository.update(portfolioId, { archived }), returnToPortfolios);
          },
        },
      ],
    );
  };

  const deletePortfolio = () => {
    if (!resource.data || action.pending) return;
    Alert.alert(
      deleting ? 'Finish deleting portfolio?' : 'Delete portfolio permanently?',
      `“${resource.data.name}” and its recorded holdings, transactions, analyses and saved scenarios will be permanently deleted. This cannot be undone. Your watchlist and other portfolios will not be changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete portfolio',
          style: 'destructive',
          onPress: () => {
            setOperation('delete');
            void action.run(`delete-${portfolioId}`, () => portfolioRepository.delete(portfolioId), returnToPortfolios);
          },
        },
      ],
    );
  };

  return (
    <PortfolioScreen title="Portfolio settings" back footer={deleting ? undefined : (
      <Button
        label="Save changes"
        onPress={save}
        pending={action.pending && operation === 'save'}
        disabled={action.pending || !resource.data || !name.trim()}
      />
    )}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        {resource.loading && !resource.data ? <Feedback loading /> : null}
        {resource.error ? <Feedback error={resource.error} onRetry={resource.reload} /> : null}
        {resource.data ? (
          <>
            <Field label="Portfolio name" value={name} onChangeText={setName} maxLength={60} editable={!action.pending && !deleting} />
            <Text style={s.label}>Display currency</Text>
            <View style={styles.currencies}>
              {PORTFOLIO_CURRENCIES.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.currency, currency === value && styles.selected]}
                  onPress={() => setCurrency(value)}
                  activeOpacity={0.7}
                  disabled={action.pending || deleting}
                  accessibilityRole="radio"
                  accessibilityLabel={`Display portfolio totals in ${value}`}
                  accessibilityState={{ checked: currency === value, disabled: action.pending || deleting }}
                >
                  <Text style={[s.text, currency === value && s.link]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.caption}>This portfolio can hold both USD and EUR stocks. Totals and analysis use your selected display currency. Recorded shares and native purchase prices stay unchanged.</Text>
            {deleting ? <Text style={s.error}>Deletion was started but has not finished. Retry below to remove the remaining records.</Text> : (
              <Button
                label={resource.data.archived ? 'Restore portfolio' : 'Archive portfolio'}
                onPress={archive}
                secondary
                pending={action.pending && operation === 'archive'}
                disabled={action.pending}
              />
            )}
            <TouchableOpacity
              style={[styles.deleteButton, action.pending && s.disabled]}
              onPress={deletePortfolio}
              activeOpacity={0.7}
              disabled={action.pending}
              accessibilityRole="button"
              accessibilityLabel="Permanently delete portfolio"
              accessibilityState={{ disabled: action.pending, busy: action.pending && operation === 'delete' }}
            >
              {action.pending && operation === 'delete' ? <ActivityIndicator size="small" color="#D9534F" /> : <Ionicons name="trash-outline" size={20} color="#D9534F" />}
              <Text style={styles.deleteText}>{deleting ? 'Retry delete portfolio' : 'Delete portfolio'}</Text>
            </TouchableOpacity>
            <Text style={s.caption}>Archive keeps your records. Delete permanently removes this portfolio from your account.</Text>
          </>
        ) : null}
        {action.error ? <Text style={s.error}>{action.error}</Text> : null}
      </ScrollView>
    </PortfolioScreen>
  );
}

const styles = StyleSheet.create({
  currencies: {
    flexDirection: 'row',
    gap: 10,
  },

  currency: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selected: {
    borderColor: '#079B73',
    backgroundColor: '#EAF8F2',
  },

  deleteButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1D1D1',
    backgroundColor: '#FFF6F6',
  },

  deleteText: {
    color: '#D9534F',
    fontSize: 15,
    fontWeight: '600',
  },
});

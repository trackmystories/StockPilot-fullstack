import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PORTFOLIO_CURRENCIES, type PortfolioCurrency, type PortfolioMeta } from '../domain/portfolio';
import { usePortfolioAction } from '../hooks/usePortfolioAction';
import { portfolioRepository } from '../infrastructure/HttpPortfolioRepository';
import { Button, Field, SectionTitle, s } from './PortfolioUI';

export function PortfolioCreateForm({ defaultCurrency = 'USD', onCreated, onCancel }: {
  defaultCurrency?: PortfolioCurrency;
  onCreated: (portfolio: PortfolioMeta) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<PortfolioCurrency>(defaultCurrency);
  const action = usePortfolioAction();
  const create = () => {
    const details = { name: name.trim(), currency };
    if (!details.name || details.name.length > 60) return;
    void action.run(JSON.stringify(details), (requestId) => portfolioRepository.create({ ...details, requestId }), onCreated);
  };

  return (
    <View style={s.card}>
      <SectionTitle>New portfolio</SectionTitle>
      <Field
        label="Portfolio name"
        value={name}
        onChangeText={setName}
        maxLength={60}
        editable={!action.pending}
        placeholder="e.g. My investments"
        autoCapitalize="sentences"
      />
      <Text style={s.label}>Display currency</Text>
      <View style={styles.currencies}>
        {PORTFOLIO_CURRENCIES.map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.currency, currency === value && styles.selected]}
            onPress={() => setCurrency(value)}
            disabled={action.pending}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ checked: currency === value, disabled: action.pending }}
          >
            <Text style={[s.text, currency === value && s.link]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.caption}>You can add both USD and EUR stocks. Totals are converted into this display currency; you can change it in settings.</Text>
      {action.error ? <Text style={s.error}>{action.error}</Text> : null}
      <Button label="Create portfolio" onPress={create} pending={action.pending} disabled={!name.trim()} />
      <Button label="Cancel" onPress={onCancel} secondary disabled={action.pending} />
    </View>
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
});

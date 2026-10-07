import { useCallback } from 'react';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { Keyboard } from 'react-native';
import type { InvestmentDraft, InvestmentStock } from '../domain/investments';
import { today } from '../domain/format';

export function useOpenPortfolioTransaction() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return useCallback((stock: InvestmentStock) => {
    Keyboard.dismiss();
    const draft: InvestmentDraft = {
      stock: { ...stock, symbol: stock.symbol.trim().toUpperCase() },
      quantity: '',
      unitPrice: '',
      date: today(),
    };

    if (navigation.getState().routeNames.includes('PortfolioTransaction')) {
      navigation.navigate('PortfolioTransaction', { draft });
    } else {
      // Enter the existing portfolio tab; keep its list as the back destination.
      navigation.navigate('Portfolios', {
        screen: 'PortfolioTransaction',
        params: { draft },
        initial: false,
      });
    }
  }, [navigation]);
}

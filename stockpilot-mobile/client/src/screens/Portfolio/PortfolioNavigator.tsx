import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import StockSearch from '../StockSearch/StockSearch';
import StockFilter from '../StockFilter/StockFilter';
import StockFilterList from '../StockFilter/StockFilterList';
import StockPilotScoreCard from '../StockPilotScoreCard/StockPilotScoreCard';
import AllScoreCards from '../StockPilotScoreCard/AllScoreCards';
import Tape from '../Tape/Tape';
import NotificationsScreen from '../Notifications/NotificationsScreen';
import NewsArticleScreen from '../News/NewsArticleScreen';
import NewsScreen from '../News/NewsScreen';
import Portfolios from './Portfolios';
import PortfolioDetail from './PortfolioDetail';
import PortfolioTransaction from './PortfolioTransaction';
import PortfolioSettings from './PortfolioSettings';
import PortfolioSale from './PortfolioSale';
import PortfolioRemoveEntry from './PortfolioRemoveEntry';
import type { PortfolioStackParamList } from './domain/navigation';

const Stack = createNativeStackNavigator<PortfolioStackParamList>();

export default function PortfolioNavigator() {
  const uid = useAppSelector((state) => state.auth.user?.uid ?? null);
  return (
    <Stack.Navigator
      key={uid ?? 'signed-out'}
      initialRouteName="PortfoliosHome"
      screenOptions={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
    >
      <Stack.Screen name="PortfoliosHome" component={Portfolios} />
      <Stack.Screen name="PortfolioDetail" component={PortfolioDetail} />
      <Stack.Screen name="PortfolioTransaction" component={PortfolioTransaction} />
      <Stack.Screen name="PortfolioSale" component={PortfolioSale} />
      <Stack.Screen name="PortfolioRemoveEntry" component={PortfolioRemoveEntry} />
      <Stack.Screen name="PortfolioSettings" component={PortfolioSettings} />
      <Stack.Screen name="StockSearch" component={StockSearch} />
      <Stack.Screen name="StockFilter" component={StockFilter} />
      <Stack.Screen name="StockFilterList" component={StockFilterList} />
      <Stack.Screen name="StockPilotScoreCard" component={StockPilotScoreCard} />
      <Stack.Screen name="AllScoreCards" component={AllScoreCards} />
      <Stack.Screen name="Tape" component={Tape} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NewsArticle" component={NewsArticleScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
    </Stack.Navigator>
  );
}

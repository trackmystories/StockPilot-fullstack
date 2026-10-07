import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from './screens/store/hooks';
import WatchList from './screens/WatchList/WatchList';
import Profile from './screens/Profile/Profile';
import PortfolioNavigator from './screens/Portfolio/PortfolioNavigator';
import type { PortfolioStackParamList } from './screens/Portfolio/domain/navigation';
import SignIn from './screens/Auth/SignIn';
import SignUp from './screens/Auth/SignUp';
import VerifyEmail from './screens/Auth/VerifyEmail';
import FeaturedPicksList from './screens/StockPilot/FeaturedPicksList';
import StockPilot from './screens/StockPilot/StockPilot';
import StockSearch from './screens/StockSearch/StockSearch';
import StockFilter from './screens/StockFilter/StockFilter';
import StockFilterList from './screens/StockFilter/StockFilterList';
import type { StockFilterRoutes } from './screens/StockFilter/domain/stockFilter';
import StockPilotScoreCard from './screens/StockPilotScoreCard/StockPilotScoreCard';
import Tape from './screens/Tape/Tape';
import NewsScreen from './screens/News/NewsScreen';
import NewsArticleScreen from './screens/News/NewsArticleScreen';
import NotificationsScreen from './screens/Notifications/NotificationsScreen';
import SecurityScreen from './screens/Security/SecurityScreen';
import ChangePasswordScreen from './screens/Security/ChangePasswordScreen';
import TermsPrivacyScreen from './screens/Legal/TermsPrivacyScreen';
import TermsOfServiceScreen from './screens/Legal/TermsOfServiceScreen';
import PrivacyPolicyScreen from './screens/Legal/PrivacyPolicyScreen';
import SmartList from './screens/SmartList/SmartList';
import { notificationNavigationRef } from './screens/Notifications/notificationNavigation';

import AllScoreCards from './screens/StockPilotScoreCard/AllScoreCards';

import type { ScoreCardItem } from './screens/StockPilotScoreCard/components/ScoreCardsSection';
import type { SelectStock } from './screens/StockPilot/types/stockPilot';

export type HomeStackParamList = StockFilterRoutes & {
  StockPilot: undefined;
  StockSearch: undefined;
  Notifications: undefined;
  News: undefined;

  SmartList: undefined;

  FeaturedPicksList: {
    title: string;
    subtitle?: string;
    stocks?: SelectStock[];
    algorithm?: string;
  };

  StockPilotScoreCard: {
    stock: SelectStock;
  };

  Tape: {
    symbol: string;
  };

  AllScoreCards: AllScoreCardsParams;

  NewsArticle: {
    articleId: string;
  };
};

export type NewsStackParamList = {
  NewsFeed: undefined;
  NewsArticle: { articleId: string };
};

type HomeTabParamList = {
  Home: undefined;
  WatchList: undefined;
  Portfolios: NavigatorScreenParams<PortfolioStackParamList> | undefined;
  Profile: undefined;
};

type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

type VerificationStackParamList = {
  VerifyEmail: undefined;
};

export type AllScoreCardsParams = {
  symbol: string;
  companyName?: string | null;
  scores: ScoreCardItem[];
};

export type WatchListStackParamList = StockFilterRoutes & {
  WatchListScreen: undefined;
  StockSearch: undefined;
  Notifications: undefined;

  StockPilotScoreCard: {
    stock: SelectStock;
  };

  Tape: {
    symbol: string;
  };

  AllScoreCards: AllScoreCardsParams;
};

export type ProfileStackParamList = StockFilterRoutes & {
  StockPilotScoreCard: { stock: SelectStock };
  Tape: { symbol: string };
  AllScoreCards: AllScoreCardsParams;
  StockSearch: undefined;
  ProfileScreen: undefined;
  Notifications: undefined;
  Security: undefined;
  ChangePassword: undefined;
  TermsPrivacy: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

const Tab = createBottomTabNavigator<HomeTabParamList>();
const HomeStackNavigator = createNativeStackNavigator<HomeStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const VerificationStack = createNativeStackNavigator<VerificationStackParamList>();
const WatchListStackNavigator = createNativeStackNavigator<WatchListStackParamList>();
const ProfileStackNavigator = createNativeStackNavigator<ProfileStackParamList>();
const Stack = createNativeStackNavigator<NewsStackParamList>();

function HomeStack() {
  return (
    <HomeStackNavigator.Navigator
      initialRouteName="StockPilot"
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <HomeStackNavigator.Screen
        name="StockPilot"
        component={StockPilot}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="SmartList"
        component={SmartList}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="StockPilotScoreCard"
        component={StockPilotScoreCard}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="Tape"
        component={Tape}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="FeaturedPicksList"
        component={FeaturedPicksList}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="NewsArticle"
        component={NewsArticleScreen}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="AllScoreCards"
        component={AllScoreCards}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="News"
        component={NewsScreen}
        options={{
          headerShown: false,
        }}
      />

      <HomeStackNavigator.Screen
        name="StockSearch"
        component={StockSearch}
        options={{
          headerShown: false,
        }}
      />
      <HomeStackNavigator.Screen name="Notifications" component={NotificationsScreen} />
      <HomeStackNavigator.Screen
        name="StockFilter"
        component={StockFilter}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
      <HomeStackNavigator.Screen
        name="StockFilterList"
        component={StockFilterList}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
    </HomeStackNavigator.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNavigator.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <ProfileStackNavigator.Screen
        name="ProfileScreen"
        component={Profile}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="Security"
        component={SecurityScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="TermsPrivacy"
        component={TermsPrivacyScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerShown: false,
        }}
      />

      <ProfileStackNavigator.Screen
        name="StockSearch"
        component={StockSearch}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStackNavigator.Screen
        name="StockFilter"
        component={StockFilter}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
      <ProfileStackNavigator.Screen
        name="StockFilterList"
        component={StockFilterList}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
      <ProfileStackNavigator.Screen
        name="StockPilotScoreCard"
        component={StockPilotScoreCard}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <ProfileStackNavigator.Screen
        name="Tape"
        component={Tape}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <ProfileStackNavigator.Screen
        name="AllScoreCards"
        component={AllScoreCards}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </ProfileStackNavigator.Navigator>
  );
}

function WatchListStack() {
  return (
    <WatchListStackNavigator.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <WatchListStackNavigator.Screen
        name="WatchListScreen"
        component={WatchList}
        options={{
          headerShown: false,
        }}
      />

      <WatchListStackNavigator.Screen
        name="StockPilotScoreCard"
        component={StockPilotScoreCard}
        options={{
          headerShown: false,
        }}
      />

      <WatchListStackNavigator.Screen
        name="Tape"
        component={Tape}
        options={{
          headerShown: false,
        }}
      />

      <WatchListStackNavigator.Screen
        name="AllScoreCards"
        component={AllScoreCards}
        options={{
          headerShown: false,
        }}
      />

      <WatchListStackNavigator.Screen
        name="StockSearch"
        component={StockSearch}
        options={{
          headerShown: false,
        }}
      />

      <WatchListStackNavigator.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <WatchListStackNavigator.Screen
        name="StockFilter"
        component={StockFilter}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
      <WatchListStackNavigator.Screen
        name="StockFilterList"
        component={StockFilterList}
        options={{ headerShown: false, gestureEnabled: false, presentation: 'card' }}
      />
    </WatchListStackNavigator.Navigator>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#16B77A',
        tabBarInactiveTintColor: '#8A8A8A',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          headerShown: false,

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="WatchList"
        component={WatchListStack}
        options={{
          headerShown: false,

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Portfolios"
        component={PortfolioNavigator}
        options={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarAccessibilityLabel: 'Portfolios',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          headerShown: false,

          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthenticationStack() {
  return (
    <AuthStack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <AuthStack.Screen
        name="SignIn"
        component={SignIn}
        options={{
          headerShown: false,
        }}
      />

      <AuthStack.Screen
        name="SignUp"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />
    </AuthStack.Navigator>
  );
}

function EmailVerificationStack() {
  return (
    <VerificationStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <VerificationStack.Screen name="VerifyEmail" component={VerifyEmail} />
    </VerificationStack.Navigator>
  );
}

function NewsNavigator() {
  const token = useAppSelector((state) => state.auth.token);

  return (
    <Stack.Navigator key={token}>
      <Stack.Screen
        name="NewsFeed"
        component={NewsScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="NewsArticle"
        component={NewsArticleScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

export function Navigation() {
  const {token, user} = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer ref={notificationNavigationRef}>
      {!token ? (
        <AuthenticationStack />
      ) : user?.emailVerified === true ? (
        <HomeTabs />
      ) : (
        <EmailVerificationStack />
      )}
    </NavigationContainer>
  );
}
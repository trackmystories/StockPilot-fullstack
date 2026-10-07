import {createNavigationContainerRef, type NavigatorScreenParams} from '@react-navigation/native';
import type {HomeStackParamList, ProfileStackParamList, WatchListStackParamList} from '../../';

export type AppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  WatchList: NavigatorScreenParams<WatchListStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export const notificationNavigationRef = createNavigationContainerRef<AppTabParamList>();
export function openNotification(articleId?: string): boolean {
  if (!notificationNavigationRef.isReady()) {
    return false;
  }
  if (articleId) {
    notificationNavigationRef.navigate('Home', {
      screen: 'NewsArticle',
      params: {articleId},
      initial: false,
    });
  } else {
    notificationNavigationRef.navigate('Profile', {
      screen: 'Notifications',
      initial: false,
    });
  }
  return true;
}

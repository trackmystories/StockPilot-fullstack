import {useEffect} from 'react';
import {ActivityIndicator, AppState, View} from 'react-native';
import {Provider} from 'react-redux';
import {Navigation} from './';
import {store} from './screens/store';
import {useAppDispatch, useAppSelector} from './screens/store/hooks';
import {initializeSession, sessionChanged} from './screens/Auth/state/authSlice';
import {getAccessToken, subscribeSession} from './screens/Auth/infrastructure/authStorage';
import {StocksProvider} from './screens/stocks/StocksProvider';

import './screens/Notifications/infrastructure/backgroundMessages';

function AppContent() {
  const dispatch = useAppDispatch();

  const {token, user, initialized} = useAppSelector((state) => state.auth);

  useEffect(() => {
    const unsubscribe = subscribeSession((session) => {
      dispatch(sessionChanged(session));
    });

    void dispatch(initializeSession());

    const refresh = () => {
      void getAccessToken().catch(() => undefined);
    };

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        refresh();
      }
    }, 30000);

    const listener = AppState.addEventListener(
      'change',

      (state) => {
        if (state === 'active') {
          refresh();
        }
      },
    );

    return () => {
      unsubscribe();

      clearInterval(timer);

      listener.remove();
    };
  }, [dispatch]);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <StocksProvider key={user?.uid ?? 'signed-out'} token={token}>
      <Navigation />
    </StocksProvider>
  );
}

export function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

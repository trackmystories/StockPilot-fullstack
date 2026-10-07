import {initializeApp} from 'firebase/app';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyApCdHAQZtIFlq_rHLmS7o7URMidEvNXCQ',
  authDomain: 'eurolisting-70ee1.firebaseapp.com',
  projectId: 'eurolisting-70ee1',
  storageBucket: 'eurolisting-70ee1.firebasestorage.app',
  messagingSenderId: '97335950291',
  appId: '1:97335950291:web:2d2a5554416ab56cb5cd26',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

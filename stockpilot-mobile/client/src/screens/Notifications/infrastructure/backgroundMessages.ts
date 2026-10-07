import {getMessaging, setBackgroundMessageHandler} from '@react-native-firebase/messaging';

// Firebase displays background notification payloads.
// Receiving a notification does not mark it as read.
setBackgroundMessageHandler(getMessaging(), async () => {});

import {Ionicons} from '@expo/vector-icons';
import {Image, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
type Props = {name: string; email: string; onPress?: () => void};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return `${parts[0].charAt(0)}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase();
}

export default function ProfileUserCard({name, email, onPress}: Props) {
  const {width, fontScale} = useWindowDimensions();
  const stacked = width < 350 || fontScale > 1.3;
  return (
    <View style={styles.shadow}>
      <Pressable
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        style={({pressed}) => [styles.card, stacked && styles.stacked, pressed && styles.pressed]}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="profileCardBackground" x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#10203F" />
                <Stop offset="52%" stopColor="#20334B" />
                <Stop offset="100%" stopColor="#078469" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#profileCardBackground)" />
          </Svg>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.mountains}
            resizeMode="contain"
          />
        </View>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{getInitials(name)}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{name}</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
          <Text style={styles.accountLabel}>YOUR STOCKPILOT ACCOUNT</Text>
        </View>
        {!!onPress && <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  shadow: {
    borderRadius: 20,
    shadowColor: '#10233E',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 4,
  },
  card: {
    minHeight: 150,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#10203F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stacked: {flexDirection: 'column', alignItems: 'flex-start'},
  pressed: {opacity: 0.9},
  mountains: {
    position: 'absolute',
    width: 190,
    height: 125,
    right: -10,
    bottom: -45,
    opacity: 0.17,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(184,194,224,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {fontSize: 25, fontWeight: '600', color: '#FFFFFF'},
  details: {flex: 1, minWidth: 0, flexShrink: 1},
  name: {fontSize: 19, lineHeight: 26, fontWeight: '700', color: '#FFFFFF'},
  email: {marginTop: 3, fontSize: 13, lineHeight: 20, color: '#C1CBE0'},
  accountLabel: {
    marginTop: 12,
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 1.1,
    fontWeight: '600',
    color: '#72DDC0',
  },
});

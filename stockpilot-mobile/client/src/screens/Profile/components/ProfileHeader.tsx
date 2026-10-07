import {Image, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
export default function ProfileHeader() {
  const {width, fontScale} = useWindowDimensions();
  const stacked = width < 390 || fontScale > 1.15;
  return (
    <View style={styles.header}>
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.watermark}
        resizeMode="contain"
        accessible={false}
      />
      <View style={[styles.row, stacked && styles.stacked]}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <Text style={styles.subtitle}>Manage your account and app settings.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {paddingTop: 8, paddingBottom: 24, position: 'relative'},
  watermark: {position: 'absolute', right: 12, top: -18, width: 168, height: 115, opacity: 0.09},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  stacked: {alignItems: 'flex-start', flexDirection: 'column'},
  title: {fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2, color: '#071B43'},
  brand: {alignItems: 'flex-end'},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 3},
  logo: {width: 30, height: 25},
  brandName: {fontSize: 18, fontWeight: '800', letterSpacing: -0.6, color: '#071B43'},
  brandAccent: {color: '#05AE7B'},
  brandTagline: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 2.3,
    color: '#8998AF',
  },
  subtitle: {marginTop: 9, maxWidth: 280, fontSize: 15, lineHeight: 22, color: '#7B8BA5'},
});

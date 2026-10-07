import {StyleSheet, Text, View} from 'react-native';
import {typography} from '../../styles/typography';

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export default function Header({title, subtitle}: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={typography.screenHeading}>{title}</Text>

      {subtitle ? <Text style={typography.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 4,
    paddingBottom: 20,
  },
});

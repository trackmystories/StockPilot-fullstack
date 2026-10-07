import {Ionicons} from '@expo/vector-icons';
import {StyleSheet, Text, View} from 'react-native';

type Props = {
  symbol: string;
};

export function SecResearchSection({symbol}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SEC Research</Text>
          <Text style={styles.subtitle}>Filing-based company research</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>SEC</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text-outline" size={24} color="#079B73" />
        </View>

        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{symbol} research report</Text>

          <Text style={styles.cardText}>
            This section is ready for the SEC research report. Connect the SEC research response
            here when the report endpoint is available in the mobile client.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  header: {
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142947',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#7788A3',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EAF8F3',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#079B73',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE7E4',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F3',
  },
  copy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#142947',
  },
  cardText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#667792',
  },
});

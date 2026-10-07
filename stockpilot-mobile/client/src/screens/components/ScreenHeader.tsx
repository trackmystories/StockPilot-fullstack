import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Ionicons} from '@expo/vector-icons';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function ScreenHeader({title, subtitle, onBack}: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={28} color="#071B43" />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  backButton: {
    width: 42,
    height: 42,
  },

  headerText: {
    flex: 1,
    marginLeft: 4,
  },

  title: {
    color: '#071B43',
    fontSize: 20,
    fontWeight: '600',
  },

  subtitle: {
    marginTop: 4,

    color: '#079B6D',

    fontSize: 15,
  },
});

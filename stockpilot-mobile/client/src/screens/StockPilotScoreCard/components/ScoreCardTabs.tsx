import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export type ScoreCardTab = 'analysis' | 'scores' | 'tape' | 'report' | 'news';

type Props = {
  activeTab: ScoreCardTab;
  onChange: (tab: ScoreCardTab) => void;
};

type TabItem = {
  id: ScoreCardTab;
  label: string;
};

const TABS: TabItem[] = [
  {id: 'analysis', label: 'Analysis'},
  {id: 'scores', label: 'Scores'},
  {id: 'tape', label: 'Tape'},
  {id: 'report', label: 'Report'},
  {id: 'news', label: 'News'},
];

export function ScoreCardTabs({activeTab, onChange}: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => onChange(tab.id)}
            >
              <Text style={[styles.label, active && styles.activeLabel]}>
                {tab.label}
              </Text>

              <View style={[styles.indicator, active && styles.activeIndicator]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE7E4',
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  tab: {
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  label: {
    paddingBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#7788A3',
  },
  activeLabel: {
    color: '#079B73',
  },
  indicator: {
    width: '100%',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  activeIndicator: {
    backgroundColor: '#079B73',
  },
});
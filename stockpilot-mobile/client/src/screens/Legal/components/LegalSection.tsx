import {StyleSheet, Text, View} from 'react-native';

type Props = {
  index: number;
  title: string;
  body?: string;
  intro?: string;
  bullets?: string[];
};

export default function LegalSection({index, title, body, intro, bullets}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        {index}. {title}
      </Text>

      {!!intro && <Text style={styles.body}>{intro}</Text>}

      {!!body && <Text style={styles.body}>{body}</Text>}

      {!!bullets && (
        <View style={styles.bullets}>
          {bullets.map((bullet) => (
            <Text key={bullet} style={styles.bullet}>
              • {bullet}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: 22,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EDF4',
    gap: 8,
  },

  heading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: '#062653',
  },

  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#7187A5',
  },

  bullets: {
    gap: 6,
    paddingLeft: 12,
  },

  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#7187A5',
  },
});

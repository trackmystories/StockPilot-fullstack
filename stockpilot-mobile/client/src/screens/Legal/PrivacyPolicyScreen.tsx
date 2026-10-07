import {Ionicons} from '@expo/vector-icons';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {ProfileStackParamList} from '../../';
import LegalSection from './components/LegalSection';
import {privacySections, PRIVACY_LAST_UPDATED} from './legalContent';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PrivacyPolicy'>;

export default function PrivacyPolicyScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={30} color="#062653" />
        </Pressable>

        <Text style={styles.heading}>Privacy Policy</Text>

        <Text style={styles.updated}>Last updated: {PRIVACY_LAST_UPDATED}</Text>

        {privacySections.map((section, index) => (
          <LegalSection
            key={section.title}
            index={index + 1}
            title={section.title}
            body={section.body}
            intro={section.intro}
            bullets={section.bullets}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 40,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 10,
  },

  heading: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
    color: '#062653',
  },

  updated: {
    marginTop: 4,
    marginBottom: 26,
    fontSize: 18,
    lineHeight: 25,
    color: '#7A8EAB',
  },
});

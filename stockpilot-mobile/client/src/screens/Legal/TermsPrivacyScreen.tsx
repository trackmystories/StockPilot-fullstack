import {Ionicons} from '@expo/vector-icons';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {typography} from '../../styles/typography';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ProfileStackParamList} from '../../';
import LegalMenuCard from './components/LegalMenuCard';
import {PRIVACY_LAST_UPDATED, TERMS_LAST_UPDATED} from './legalContent';
import Header from '../components/Header';

type Props = NativeStackScreenProps<ProfileStackParamList, 'TermsPrivacy'>;

export default function TermsPrivacyScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={30} color="#062653" />
        </Pressable>

        <Header title="Terms & Privacy" subtitle="Legal information and how we handle your data" />

        <View style={styles.cards}>
          <LegalMenuCard
            icon="document-text-outline"
            iconColor="#1677FF"
            iconBackgroundColor="#DDEEFF"
            title="Terms of Service"
            subtitle="Rules for using StockPilot"
            onPress={() => {
              navigation.navigate('TermsOfService');
            }}
          />

          <LegalMenuCard
            icon="shield-checkmark-outline"
            iconColor="#00A878"
            iconBackgroundColor="#DDF8EE"
            title="Privacy Policy"
            subtitle="How we collect and use data"
            onPress={() => {
              navigation.navigate('PrivacyPolicy');
            }}
          />
        </View>

        <View style={styles.privacyCard}>
          <View style={styles.privacyIconContainer}>
            <Ionicons name="lock-closed-outline" size={28} color="#00A878" />
          </View>

          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Your privacy matters</Text>

            <Text style={styles.privacyText}>
              StockPilot is designed to keep your account and personal information secure.
            </Text>

            <Text style={styles.privacyText}>We do not sell your personal data.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>StockPilot version 1.0.0</Text>
          <Text style={styles.footerText}>Terms last updated: {TERMS_LAST_UPDATED}</Text>
          <Text style={styles.footerText}>Privacy policy last updated: {PRIVACY_LAST_UPDATED}</Text>
        </View>
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

  cards: {
    marginTop: 28,
    gap: 14,
  },

  privacyCard: {
    marginTop: 22,
    borderRadius: 24,
    backgroundColor: '#ECFAF5',
    padding: 18,
    flexDirection: 'row',
    gap: 16,
  },

  privacyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#DDF8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  privacyCopy: {
    flex: 1,
    gap: 10,
  },

  privacyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12734F',
  },

  privacyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#7187A5',
  },

  footer: {
    marginTop: 30,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: '#E7EDF4',
    gap: 6,
  },

  footerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7A8EAB',
  },
});

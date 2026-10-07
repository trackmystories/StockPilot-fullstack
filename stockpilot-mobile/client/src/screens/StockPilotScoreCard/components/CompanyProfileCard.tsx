import {useState} from 'react';

import {ActivityIndicator, Linking, Pressable, StyleSheet, Text, View} from 'react-native';

import type {FmpCompanyProfile} from '../../stocks/useFmpCompanyProfile';

type Props = {
  profile: FmpCompanyProfile | null;
  loading: boolean;
  error: string | null;
};

type RowProps = {
  label: string;
  value: string;
};

function Row({label, value}: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const formatEmployees = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return value.toLocaleString();
};

export function CompanyProfileCard({profile, loading, error}: Props) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Company Profile</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />

          <Text style={styles.loadingText}>Loading company profile…</Text>
        </View>
      ) : null}

      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && profile ? (
        <>
          <Row label="Company" value={profile.companyName ?? profile.symbol} />

          <Row label="Exchange" value={profile.exchange || 'N/A'} />

          <Row label="Country" value={profile.country ?? 'N/A'} />

          <Row label="CEO" value={profile.ceo ?? 'N/A'} />

          <Row label="Employees" value={formatEmployees(profile.fullTimeEmployees)} />

          <Row label="IPO Date" value={profile.ipoDate ?? 'N/A'} />

          {profile.website ? (
            <Pressable style={styles.websiteRow} onPress={() => Linking.openURL(profile.website!)}>
              <Text style={styles.label}>Website</Text>

              <Text numberOfLines={1} style={styles.website}>
                {profile.website}
              </Text>
            </Pressable>
          ) : null}

          {profile.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>About</Text>

              <Text
                numberOfLines={isDescriptionExpanded ? undefined : 7}
                onTextLayout={(event) => {
                  if (isDescriptionExpanded) {
                    return;
                  }

                  setIsDescriptionTruncated(event.nativeEvent.lines.length >= 7);
                }}
                style={styles.description}
              >
                {profile.description}
              </Text>

              {isDescriptionTruncated || isDescriptionExpanded ? (
                <Pressable
                  onPress={() => setIsDescriptionExpanded((current) => !current)}
                  hitSlop={8}
                >
                  <Text style={styles.expandText}>
                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EFEC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#142947',
  },

  source: {
    marginTop: 4,
    fontSize: 12,
    color: '#7788A3',
  },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },

  loadingText: {
    fontSize: 13,
    color: '#667792',
  },

  error: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B54747',
  },

  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECEA',
  },

  websiteRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECEA',
  },

  label: {
    flex: 1,
    fontSize: 14,
    color: '#667792',
  },

  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#142947',
    textAlign: 'right',
  },

  website: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#079B73',
    textAlign: 'right',
  },

  descriptionSection: {
    marginTop: 18,
  },

  descriptionTitle: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#142947',
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667792',
  },

  expandText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#079B73',
  },
});

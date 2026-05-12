import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/auth';
import { clearAllData, loadTransactions, loadImportBatches } from '@/services/storage';
import { C } from '@/constants/theme';

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [txCount, setTxCount] = useState(0);
  const [batchCount, setBatchCount] = useState(0);

  useFocusEffect(useCallback(() => {
    Promise.all([loadTransactions(), loadImportBatches()]).then(([txs, batches]) => {
      setTxCount(txs.length);
      setBatchCount(batches.length);
    });
  }, []));

  const initials = (user?.name ?? 'U')
    .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const memberSince = user?.memberSince
    ? new Date(user.memberSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const maskedAccount = user?.accountNumber
    ? `•••• •••• ${user.accountNumber.slice(-4)}`
    : '•••• ••••';

  const handleExport = async () => {
    const txs = await loadTransactions();
    if (txs.length === 0) {
      Alert.alert('No data', 'You have no transactions to export.');
      return;
    }
    const header = 'Date,Description,Amount,Type,Category\n';
    const rows = txs.map((t) =>
      `${t.date},"${t.description.replace(/"/g, '""')}",${t.amount},${t.type},${t.category}`
    ).join('\n');
    await Share.share({ message: header + rows, title: 'Transactions.csv' });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear all data',
      'This will permanently delete all your transactions and import history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear data', style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setTxCount(0);
            setBatchCount(0);
            Alert.alert('Done', 'All local data has been cleared.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar block */}
        <View style={s.avatarBlock}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{user?.name ?? '—'}</Text>
          <View style={s.accountBadge}>
            <View style={s.activeDot} />
            <Text style={s.accountBadgeText}>Personal Current Account</Text>
          </View>
          <Text style={s.accountNumber}>{maskedAccount}</Text>
        </View>

        {/* Account Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Details</Text>
          <Row icon="card-outline" label="Account number" value={maskedAccount} />
          <Row icon="git-branch-outline" label="Sort code" value={user?.sortCode ?? '—'} />
          <Row icon="business-outline" label="Account type" value="Personal Current Account" />
          <Row icon="calendar-outline" label="Member since" value={memberSince} last />
        </View>

        {/* Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Status</Text>
          <Row icon="shield-checkmark-outline" label="KYC verification" value="Verified" valueColor={C.income} />
          <Row icon="document-text-outline" label="ID document" value="Passport" />
          <Row icon="checkmark-circle-outline" label="Account status" value="Active" valueColor={C.income} />
          <Row icon="flag-outline" label="Nationality" value={user?.nationality ?? '—'} last />
        </View>

        {/* Personal Information */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personal Information</Text>
          <Row icon="person-outline" label="Full name" value={user?.name ?? '—'} />
          <Row icon="mail-outline" label="Email address" value={user?.email ?? '—'} />
          <Row icon="call-outline" label="Phone number" value={user?.phone ?? '—'} last />
        </View>

        {/* Security */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Security</Text>
          <Row icon="phone-portrait-outline" label="Two-factor authentication" value="Enabled" valueColor={C.income} />
          <Row icon="finger-print-outline" label="Biometric login" value="Enabled" valueColor={C.income} />
          <Row icon="time-outline" label="Last sign in" value="Today" last />
        </View>

        {/* Activity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Activity</Text>
          <Row icon="receipt-outline" label="Total transactions" value={String(txCount)} />
          <Row icon="cloud-upload-outline" label="Import batches" value={String(batchCount)} last />
        </View>

        {/* Data & Privacy */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Data & Privacy</Text>
          <ActionRow icon="download-outline" label="Export transactions (CSV)" onPress={handleExport} />
          <ActionRow
            icon="trash-outline" label="Clear all local data"
            onPress={handleClearData} destructive last
          />
        </View>

        {/* Legal */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Legal</Text>
          <ActionRow icon="shield-outline" label="Privacy Policy" onPress={() => Alert.alert('Privacy Policy', 'DWK Finance is FCA authorised. Your data is encrypted at rest and in transit under GDPR.')} />
          <ActionRow icon="document-outline" label="Terms of Service" onPress={() => Alert.alert('Terms of Service', 'By using DWK Finance you agree to our terms of service available at dwk.co.uk/terms.')} last />
        </View>

        {/* FCA notice */}
        <View style={s.fcaBox}>
          <Ionicons name="information-circle-outline" size={14} color={C.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={s.fcaText}>
            DWK Finance is authorised and regulated by the Financial Conduct Authority (FCA). Your eligible deposits are protected up to £85,000 by the FSCS.
          </Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={C.destructive} style={{ marginRight: 10 }} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>DWK Finance · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon, label, value, valueColor, last,
}: {
  icon: any; label: string; value: string; valueColor?: string; last?: boolean;
}) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={17} color={C.brandLight} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  icon, label, onPress, destructive, last,
}: {
  icon: any; label: string; onPress: () => void; destructive?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={17} color={destructive ? C.destructive : C.brandLight} />
      </View>
      <Text style={[s.rowLabel, destructive && { color: C.destructive }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  avatarBlock: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  accountBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.incomeBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: C.incomeBorder,
    marginBottom: 8,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.income, marginRight: 6 },
  accountBadgeText: { fontSize: 12, fontWeight: '600', color: C.income },
  accountNumber: { fontSize: 13, color: C.textMuted, letterSpacing: 2, marginTop: 2 },

  section: {
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 14, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: 14, color: C.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary, maxWidth: '45%', textAlign: 'right' },

  fcaBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.brandBg, borderRadius: 14,
    borderWidth: 1, borderColor: C.brandBorder,
    padding: 14, marginBottom: 20,
  },
  fcaText: { flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 15, marginBottom: 20,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: C.destructive },

  versionText: { textAlign: 'center', fontSize: 12, color: C.textMuted, marginBottom: 8 },
});

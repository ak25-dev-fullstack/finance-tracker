import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  icon: string;
  color: string;
  smartAlert: boolean;
};

const INITIAL_GOALS: Goal[] = [
  { id: '1', name: 'Emergency Fund', target: 5000, saved: 3200, deadline: 'Dec 2025', icon: 'shield-checkmark-outline', color: '#22C55E', smartAlert: true },
  { id: '2', name: 'Holiday — Japan', target: 2500, saved: 840, deadline: 'Aug 2025', icon: 'airplane-outline', color: '#6bd8cb', smartAlert: false },
  { id: '3', name: 'New Laptop', target: 1200, saved: 1200, deadline: 'Mar 2025', icon: 'laptop-outline', color: '#AB47BC', smartAlert: false },
];

const ICON_OPTIONS = [
  'home-outline', 'car-outline', 'airplane-outline', 'laptop-outline',
  'shield-checkmark-outline', 'heart-outline', 'school-outline', 'gift-outline',
];
const COLOR_OPTIONS = ['#22C55E', '#6bd8cb', '#F59E0B', '#EF4444', '#AB47BC', '#42A5F5', '#FF7043', '#EC407A'];

export default function SaveScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pickedIcon, setPickedIcon] = useState(ICON_OPTIONS[0]);
  const [pickedColor, setPickedColor] = useState(COLOR_OPTIONS[0]);
  const [smartAlert, setSmartAlert] = useState(false);

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  const toggleAlert = (id: string) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, smartAlert: !g.smartAlert } : g)));

  const addGoal = () => {
    if (!name.trim() || !target.trim()) return;
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: name.trim(),
        target: parseFloat(target) || 0,
        saved: parseFloat(saved) || 0,
        deadline: deadline.trim() || 'No deadline',
        icon: pickedIcon,
        color: pickedColor,
        smartAlert,
      },
    ]);
    setShowModal(false);
    setName(''); setTarget(''); setSaved(''); setDeadline('');
    setPickedIcon(ICON_OPTIONS[0]); setPickedColor(COLOR_OPTIONS[0]); setSmartAlert(false);
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Save</Text>
            <Text style={s.sub}>Track your savings goals</Text>
          </View>
          <Pressable style={s.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Overview */}
        <View style={s.overviewCard}>
          <Text style={s.overviewLabel}>Total Saved</Text>
          <Text style={s.overviewAmount}>£{totalSaved.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` as any, backgroundColor: C.brandLight }]} />
          </View>
          <Text style={s.overviewSub}>
            {((totalSaved / totalTarget) * 100).toFixed(0)}% of £{totalTarget.toLocaleString('en-GB')} total target
          </Text>
        </View>

        {/* Smart Alerts Banner */}
        <View style={s.alertBanner}>
          <Ionicons name="notifications-outline" size={18} color={C.warning} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.alertBannerTitle}>Smart Alerts Active</Text>
            <Text style={s.alertBannerSub}>We'll notify you when you're falling behind on a goal</Text>
          </View>
        </View>

        {/* Goals */}
        <Text style={s.sectionTitle}>Your Goals</Text>
        {goals.map((goal) => {
          const pct = Math.min((goal.saved / goal.target) * 100, 100);
          const done = goal.saved >= goal.target;
          return (
            <View key={goal.id} style={s.goalCard}>
              <View style={s.goalTop}>
                <View style={[s.goalIcon, { backgroundColor: goal.color + '22' }]}>
                  <Ionicons name={goal.icon as any} size={20} color={goal.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.goalNameRow}>
                    <Text style={s.goalName}>{goal.name}</Text>
                    {done && (
                      <View style={s.doneBadge}>
                        <Text style={s.doneBadgeText}>Done</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.goalDeadline}>{goal.deadline}</Text>
                </View>
                <View style={s.goalAmountCol}>
                  <Text style={[s.goalSaved, { color: goal.color }]}>
                    £{goal.saved.toLocaleString('en-GB')}
                  </Text>
                  <Text style={s.goalTarget}>of £{goal.target.toLocaleString('en-GB')}</Text>
                </View>
              </View>

              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
              </View>
              <Text style={s.pctLabel}>{pct.toFixed(0)}% complete</Text>

              <View style={s.goalFooter}>
                <Ionicons name="notifications-outline" size={14} color={goal.smartAlert ? C.brandLight : C.textMuted} />
                <Text style={[s.alertLabel, { color: goal.smartAlert ? C.brandLight : C.textMuted }]}>
                  Smart Alerts
                </Text>
                <Switch
                  value={goal.smartAlert}
                  onValueChange={() => toggleAlert(goal.id)}
                  trackColor={{ false: C.border, true: C.brand }}
                  thumbColor={goal.smartAlert ? C.brandLight : C.textMuted}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          );
        })}
        {/* Consult Adviser */}
        <View style={s.adviserCard}>
          <View style={s.adviserCardHeader}>
            <View style={s.adviserIconWrap}>
              <Ionicons name="people-outline" size={22} color={C.brandLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adviserCardTitle}>Speak to an Adviser</Text>
              <Text style={s.adviserCardSub}>Get personalised savings advice from your DWK adviser</Text>
            </View>
          </View>
          <Pressable style={s.adviserBtn} onPress={() => router.push('/(tabs)/adviser')}>
            <Text style={s.adviserBtnText}>Consult Adviser</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>New Saving Goal</Text>

            <Text style={s.fieldLabel}>Goal name</Text>
            <TextInput style={s.input} placeholder="e.g. Holiday fund" placeholderTextColor={C.textMuted} value={name} onChangeText={setName} />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Target (£)</Text>
                <TextInput style={s.input} placeholder="5000" placeholderTextColor={C.textMuted} keyboardType="numeric" value={target} onChangeText={setTarget} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Already saved (£)</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={saved} onChangeText={setSaved} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Deadline</Text>
            <TextInput style={s.input} placeholder="e.g. Dec 2025" placeholderTextColor={C.textMuted} value={deadline} onChangeText={setDeadline} />

            <Text style={s.fieldLabel}>Icon</Text>
            <View style={s.iconRow}>
              {ICON_OPTIONS.map((ic) => (
                <Pressable key={ic} style={[s.iconOption, pickedIcon === ic && s.iconOptionActive]} onPress={() => setPickedIcon(ic)}>
                  <Ionicons name={ic as any} size={18} color={pickedIcon === ic ? C.brandLight : C.textMuted} />
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>Colour</Text>
            <View style={s.colorRow}>
              {COLOR_OPTIONS.map((col) => (
                <Pressable key={col} style={[s.colorSwatch, { backgroundColor: col }, pickedColor === col && s.colorSwatchActive]} onPress={() => setPickedColor(col)}>
                  {pickedColor === col && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <View style={s.alertToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.alertToggleTitle}>Smart Alerts</Text>
                <Text style={s.alertToggleSub}>Get notified if you fall behind</Text>
              </View>
              <Switch value={smartAlert} onValueChange={setSmartAlert} trackColor={{ false: C.border, true: C.brand }} thumbColor={smartAlert ? C.brandLight : C.textMuted} />
            </View>

            <Pressable style={[s.saveBtn, (!name.trim() || !target.trim()) && { opacity: 0.4 }]} onPress={addGoal} disabled={!name.trim() || !target.trim()}>
              <Text style={s.saveBtnText}>Create Goal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },

  overviewCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.brand, borderRadius: 20, padding: 22 },
  overviewLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  overviewAmount: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 14 },
  overviewSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14, backgroundColor: C.warningBg, borderWidth: 1, borderColor: C.warningBorder, borderRadius: 14, padding: 14 },
  alertBannerTitle: { fontSize: 13, fontWeight: '600', color: C.warning },
  alertBannerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginHorizontal: 20, marginTop: 22, marginBottom: 12 },

  goalCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  goalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  goalNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  goalDeadline: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  goalAmountCol: { alignItems: 'flex-end' },
  goalSaved: { fontSize: 16, fontWeight: '700' },
  goalTarget: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  doneBadge: { backgroundColor: C.incomeBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  doneBadgeText: { fontSize: 11, fontWeight: '600', color: C.income },

  progressBarBg: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  pctLabel: { fontSize: 11, color: C.textMuted, marginTop: 6 },

  goalFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  alertLabel: { flex: 1, fontSize: 12, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 18 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textPrimary, marginBottom: 16 },
  row: { flexDirection: 'row' },

  iconRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  iconOption: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  iconOptionActive: { borderColor: C.brand, backgroundColor: C.brandBg },

  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },

  alertToggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 20 },
  alertToggleTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  alertToggleSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  saveBtn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  adviserCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.brandBorder, padding: 18 },
  adviserCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  adviserIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  adviserCardTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  adviserCardSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  adviserBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12 },
  adviserBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

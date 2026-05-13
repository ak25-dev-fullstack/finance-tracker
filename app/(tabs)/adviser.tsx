import { C } from '@/constants/theme';
import { useOnboardingTarget } from '@/context/onboarding';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Logo from '../components/Logo';

// ─── Data ────────────────────────────────────────────────────────────────────

const ADVISERS = [
  { name: 'James Whitfield', role: 'Senior Wealth Adviser', status: 'Online', avatar: 'JW', color: '#42A5F5' },
  { name: 'Priya Nair', role: 'Portfolio Analyst', status: 'Away', avatar: 'PN', color: '#AB47BC' },
];

const LATEST_RECOMMENDATIONS = [
  { id: '1', author: 'James Whitfield', role: 'Senior Adviser', date: '8 May 2025', text: 'Your equity allocation looks healthy. Consider trimming crypto exposure below 5% to reduce volatility risk.', avatar: 'JW' },
  { id: '2', author: 'Priya Nair', role: 'Portfolio Analyst', date: '2 May 2025', text: 'The MSCI World ETF is a strong core holding. Worth reviewing the UK Gilts position given current rate expectations.', avatar: 'PN' },
];

type HistoryEntry = {
  id: string;
  date: string;
  type: 'quick_message' | 'consultation_request' | 'consultation_completed' | 'adviser_recommendation' | 'client_response';
  author: string;
  content: string;
};

const HISTORY: HistoryEntry[] = [
  { id: 'h1', date: '8 May 2025', type: 'adviser_recommendation', author: 'James Whitfield', content: 'Your crypto allocation (10.2%) is above the threshold for a moderate-risk profile. I recommend reducing this to below 5% and reallocating proceeds into a global equity ETF such as IWRD or VWRL.' },
  { id: 'h2', date: '8 May 2025', type: 'client_response', author: 'You', content: "Thanks James. I'll action this by the end of the month and reduce BTC/ETH combined to around £700." },
  { id: 'h3', date: '18 Apr 2025', type: 'consultation_completed', author: 'James Whitfield', content: 'Annual portfolio review completed. Key outcomes: (1) Equity allocation reduced by 10% in favour of bonds given 5-year horizon. (2) ISA allowance fully utilised for tax year. (3) Pension contributions increased by £50/mo. Client agreed to all recommendations.' },
  { id: 'h4', date: '15 Apr 2025', type: 'consultation_request', author: 'You', content: 'Requested consultation — Annual Portfolio Review. Preferred time: Week of 18 Apr, any afternoon.' },
  { id: 'h5', date: '5 Mar 2025', type: 'adviser_recommendation', author: 'Priya Nair', content: 'Selling UK Gilts held within your Stocks & Shares ISA has no capital gains tax implications. If held outside an ISA, disposal at current values would remain within your annual CGT allowance (£3,000 for 2025/26).' },
  { id: 'h6', date: '2 Mar 2025', type: 'quick_message', author: 'You', content: 'Can you confirm the tax implications of selling my UK Gilts position?' },
];

const HISTORY_TYPE_META: Record<HistoryEntry['type'], { label: string; icon: string; color: string }> = {
  quick_message:          { label: 'Quick message',          icon: 'chatbubble-outline',         color: '#00b4d8' },
  consultation_request:   { label: 'Consultation requested', icon: 'calendar-outline',            color: '#F59E0B' },
  consultation_completed: { label: 'Consultation completed', icon: 'checkmark-circle-outline',    color: '#22C55E' },
  adviser_recommendation: { label: 'Adviser recommendation', icon: 'bulb-outline',                color: '#42A5F5' },
  client_response:        { label: 'Your response',          icon: 'return-down-forward-outline', color: '#AB47BC' },
};

const CONSULTATION_TYPES = ['Portfolio Review', 'Tax Planning', 'Retirement Planning', 'Mortgage Advice', 'General Financial Advice'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdviserScreen() {
  const [teamOpen, setTeamOpen] = useState(true);
  const [recsOpen, setRecsOpen] = useState(true);

  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const [consultationOpen, setConsultationOpen] = useState(false);
  const [consultationType, setConsultationType] = useState('');
  const [consultationNote, setConsultationNote] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [consultationSent, setConsultationSent] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const adviserTeamRef = useOnboardingTarget('adviser_team');
  const adviserMessageRef = useOnboardingTarget('adviser_message');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessage('');
    setMessageSent(true);
  };

  const handleRequestConsultation = () => {
    if (!consultationType) return;
    setConsultationType('');
    setConsultationNote('');
    setPreferredTime('');
    setConsultationSent(true);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Logo height={28} />
          <Text style={[s.title, { marginTop: 6 }]}>Adviser</Text>
          <Text style={s.sub}>Your DWK advisory team</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Advisory team */}
        <View ref={adviserTeamRef} collapsable={false}>
          <Pressable style={s.accordionHeader} onPress={() => setTeamOpen((o) => !o)}>
            <View style={s.accordionIconWrap}>
              <Ionicons name="people-outline" size={18} color={C.brandLight} />
            </View>
            <Text style={s.accordionTitle}>Your advisory team</Text>
            <Ionicons name={teamOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
          </Pressable>
        </View>
        {teamOpen && ADVISERS.map((adv) => (
          <View key={adv.name} style={s.adviserCard}>
            <View style={[s.adviserAvatar, { backgroundColor: adv.color + '33' }]}>
              <Text style={[s.adviserAvatarText, { color: adv.color }]}>{adv.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adviserName}>{adv.name}</Text>
              <Text style={s.adviserRole}>{adv.role}</Text>
            </View>
            <View style={[s.statusDot, { backgroundColor: adv.status === 'Online' ? C.income : C.warning }]} />
            <Text style={[s.statusText, { color: adv.status === 'Online' ? C.income : C.warning }]}>{adv.status}</Text>
          </View>
        ))}

        {/* Latest recommendations */}
        <Pressable style={s.accordionHeader} onPress={() => setRecsOpen((o) => !o)}>
          <View style={s.accordionIconWrap}>
            <Ionicons name="bulb-outline" size={18} color={C.brandLight} />
          </View>
          <Text style={s.accordionTitle}>Latest recommendations</Text>
          <Ionicons name={recsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
        </Pressable>
        {recsOpen && LATEST_RECOMMENDATIONS.map((c) => (
          <View key={c.id} style={s.commentCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={s.commentAvatar}>
                <Text style={s.commentAvatarText}>{c.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.commentAuthor}>{c.author}</Text>
                <Text style={s.commentMeta}>{c.role} · {c.date}</Text>
              </View>
            </View>
            <Text style={s.commentText}>{c.text}</Text>
          </View>
        ))}

        {/* Portfolio access (accordion button) */}
        <Pressable style={s.accordionHeader} onPress={() => setPortfolioOpen((o) => !o)}>
          <View style={s.accordionIconWrap}>
            <Ionicons name="briefcase-outline" size={18} color={C.brandLight} />
          </View>
          <Text style={s.accordionTitle}>Portfolio access</Text>
          <Ionicons name={portfolioOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
        </Pressable>

        {portfolioOpen && (
          <View style={s.card}>
            <Text style={s.shareDesc}>Grant your adviser read-only access to your portfolio so they can provide fully informed, personalised recommendations without requiring you to share statements manually.</Text>
            <Pressable style={s.saveBtn}>
              <Text style={s.saveBtnText}>Share portfolio access</Text>
            </Pressable>
          </View>
        )}

        {/* Send a quick message */}
        <View ref={adviserMessageRef} collapsable={false}>
          <Pressable style={s.accordionHeader} onPress={() => setMessageOpen((o) => !o)}>
            <View style={s.accordionIconWrap}>
              <Ionicons name="chatbubble-outline" size={18} color={C.brandLight} />
            </View>
            <Text style={s.accordionTitle}>Send a quick message</Text>
            <Ionicons name={messageOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
          </Pressable>
        </View>
        {messageOpen && (
          <View style={s.card}>
            {messageSent ? (
              <View style={s.confirmBanner}>
                <Ionicons name="checkmark-circle" size={20} color={C.income} />
                <View style={{ flex: 1 }}>
                  <Text style={s.confirmTitle}>Message sent</Text>
                  <Text style={s.confirmSub}>You will be notified when your adviser replies.</Text>
                </View>
                <Pressable onPress={() => setMessageSent(false)}>
                  <Ionicons name="close" size={18} color={C.textMuted} />
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={s.cardHint}>Ask a quick question or flag something to your adviser. Responses are usually within one business day.</Text>
                <TextInput
                  style={[s.input, { height: 88, textAlignVertical: 'top' }]}
                  placeholder="e.g. Should I top up my ISA before the tax year ends?"
                  placeholderTextColor={C.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <Pressable style={[s.saveBtn, !message.trim() && { opacity: 0.4 }]} onPress={handleSendMessage} disabled={!message.trim()}>
                  <Text style={s.saveBtnText}>Send message</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Request a consultation */}
        <Pressable style={s.accordionHeader} onPress={() => setConsultationOpen((o) => !o)}>
          <View style={s.accordionIconWrap}>
            <Ionicons name="calendar-outline" size={18} color={C.brandLight} />
          </View>
          <Text style={s.accordionTitle}>Request a consultation</Text>
          <Ionicons name={consultationOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
        </Pressable>
        {consultationOpen && (
          <View style={s.card}>
            {consultationSent ? (
              <View style={s.confirmBanner}>
                <Ionicons name="checkmark-circle" size={20} color={C.income} />
                <View style={{ flex: 1 }}>
                  <Text style={s.confirmTitle}>Consultation requested</Text>
                  <Text style={s.confirmSub}>Your adviser will confirm a time shortly. You will be notified when they respond.</Text>
                </View>
                <Pressable onPress={() => setConsultationSent(false)}>
                  <Ionicons name="close" size={18} color={C.textMuted} />
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={s.cardHint}>Book a scheduled call or video meeting with your DWK adviser to discuss your financial plan in depth.</Text>
                <Text style={s.fieldLabel}>Type of consultation</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {CONSULTATION_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      style={[s.filterPill, consultationType === t && s.filterPillActive]}
                      onPress={() => setConsultationType(t)}
                    >
                      <Text style={[s.filterPillText, consultationType === t && s.filterPillTextActive]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Preferred date / time</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Any afternoon next week"
                  placeholderTextColor={C.textMuted}
                  value={preferredTime}
                  onChangeText={setPreferredTime}
                />
                <Text style={s.fieldLabel}>Additional context (optional)</Text>
                <TextInput
                  style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                  placeholder="Brief description of what you'd like to discuss…"
                  placeholderTextColor={C.textMuted}
                  value={consultationNote}
                  onChangeText={setConsultationNote}
                  multiline
                />
                <Pressable
                  style={[s.saveBtn, !consultationType && { opacity: 0.4 }]}
                  onPress={handleRequestConsultation}
                  disabled={!consultationType}
                >
                  <Text style={s.saveBtnText}>Request consultation</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* History (dropdown button) */}
        <Pressable style={s.accordionHeader} onPress={() => setHistoryOpen((o) => !o)}>
          <View style={s.accordionIconWrap}>
            <Ionicons name="time-outline" size={18} color={C.brandLight} />
          </View>
          <Text style={s.accordionTitle}>History</Text>
          <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
        </Pressable>

        {historyOpen && (
          <View style={{ marginTop: 16 }}>
            {HISTORY.map((entry) => {
              const meta = HISTORY_TYPE_META[entry.type];
              return (
                <View key={entry.id} style={[s.historyEntry, { borderLeftColor: meta.color }]}> 
                  <View style={s.historyHeader}>
                    <View style={[s.historyIconWrap, { backgroundColor: meta.color + '22' }]}>
                      <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                    </View>
                    <Text style={[s.historyType, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={s.historyDate}>{entry.date}</Text>
                  </View>
                  <Text style={s.historyAuthor}>{entry.author === 'You' ? 'You' : entry.author}</Text>
                  <Text style={s.historyContent}>{entry.content}</Text>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 80 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginHorizontal: 20, marginTop: 22, marginBottom: 12 },

  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 16, marginBottom: 4, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14 },
  accordionIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  accordionTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: C.textPrimary },
  card: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },

  adviserCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  adviserAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  adviserAvatarText: { fontSize: 14, fontWeight: '700' },
  adviserName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  adviserRole: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  commentCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: C.brandLight },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  commentMeta: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  commentText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  shareDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 16 },
  cardHint: { fontSize: 13, color: C.textMuted, lineHeight: 20, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  filterPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  filterPillText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  filterPillTextActive: { color: '#fff', fontWeight: '600' },

  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textPrimary, marginBottom: 16 },
  saveBtn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  confirmBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.incomeBg, borderRadius: 14, borderWidth: 1, borderColor: C.incomeBorder, padding: 14 },
  confirmTitle: { fontSize: 14, fontWeight: '600', color: C.income },
  confirmSub: { fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 18 },

  historyEntry: { marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 14 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  historyIconWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  historyType: { fontSize: 11, fontWeight: '700', flex: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  historyDate: { fontSize: 11, color: C.textMuted },
  historyAuthor: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
  historyContent: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { C } from '@/constants/theme';

const TOTAL_STEPS = 4;
const DEMO_OTP = '123456';

type FaceState = 'idle' | 'scanning' | 'detecting' | 'liveness' | 'matching' | 'done';

interface DocFile { name: string }

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — Personal Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');

  // Step 2 — Documents
  const [idDoc, setIdDoc] = useState<DocFile | null>(null);
  const [addressDoc, setAddressDoc] = useState<DocFile | null>(null);

  // Step 3 — Face
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Step 4 — 2FA
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRef = useRef<TextInput>(null);

  const fillDemoInfo = () => {
    setFirstName('Alex');
    setLastName('Johnson');
    setDob('14 / 03 / 1990');
    setEmail('alex.johnson@example.com');
    setPhone('+44 7700 900123');
    setNationality('British');
  };

  const goNext = () => setStep((s) => s + 1);

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!(firstName.trim() && lastName.trim() && dob.trim() && email.trim() && phone.trim());
      case 2: return idDoc !== null;
      case 3: return faceState === 'done';
      default: return true;
    }
  };

  // ─── Face scan ───────────────────────────────────────────────────────────────
  const startFaceScan = () => {
    setFaceState('scanning');
    scanLineAnim.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    scanLoopRef.current = loop;
    loop.start();

    setTimeout(() => setFaceState('detecting'), 2000);
    setTimeout(() => setFaceState('liveness'), 3800);
    setTimeout(() => setFaceState('matching'), 5400);
    setTimeout(() => {
      scanLoopRef.current?.stop();
      setFaceState('done');
    }, 7000);
  };

  // ─── Document pick ────────────────────────────────────────────────────────────
  const pickDocument = async (setter: (d: DocFile) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        setter({ name: result.assets[0].name });
      }
    } catch { /* silently ignore */ }
  };

  // ─── OTP ─────────────────────────────────────────────────────────────────────
  const sendOtp = async () => {
    setOtpLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setOtpLoading(false);
    setOtpSent(true);
  };

  const verifyOtp = () => {
    if (otpCode !== DEMO_OTP) {
      Alert.alert('Invalid code', 'The code you entered is incorrect. Use 123456 for the demo.');
      return;
    }
    goNext();
  };

  // ─── Step renderers ───────────────────────────────────────────────────────────
  const renderPersonalDetails = () => (
    <View>
      <Text style={s.stepTitle}>Personal Details</Text>
      <Text style={s.stepSubtitle}>We need some basic information to set up your account.</Text>

      <TouchableOpacity style={s.demoFillBtn} onPress={fillDemoInfo}>
        <Ionicons name="flash-outline" size={15} color={C.brand} style={{ marginRight: 6 }} />
        <Text style={s.demoFillBtnText}>Fill in demo info</Text>
      </TouchableOpacity>

      <View style={s.row}>
        <View style={[s.fieldWrap, { flex: 1, marginRight: 8 }]}>
          <Text style={s.label}>First Name</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={firstName} onChangeText={setFirstName}
              placeholder="John" placeholderTextColor={C.textMuted} selectionColor={C.brand} underlineColorAndroid="transparent" />
          </View>
        </View>
        <View style={[s.fieldWrap, { flex: 1 }]}>
          <Text style={s.label}>Last Name</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={lastName} onChangeText={setLastName}
              placeholder="Smith" placeholderTextColor={C.textMuted} selectionColor={C.brand} underlineColorAndroid="transparent" />
          </View>
        </View>
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.label}>Date of Birth</Text>
        <View style={s.inputWrap}>
          <Ionicons name="calendar-outline" size={17} color={C.textMuted} style={s.inputIcon} />
          <TextInput style={s.input} value={dob} onChangeText={setDob}
            placeholder="DD / MM / YYYY" placeholderTextColor={C.textMuted}
            selectionColor={C.brand} underlineColorAndroid="transparent" keyboardType="numbers-and-punctuation" />
        </View>
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.label}>Nationality</Text>
        <View style={s.inputWrap}>
          <Ionicons name="flag-outline" size={17} color={C.textMuted} style={s.inputIcon} />
          <TextInput style={s.input} value={nationality} onChangeText={setNationality}
            placeholder="British" placeholderTextColor={C.textMuted} selectionColor={C.brand} underlineColorAndroid="transparent" />
        </View>
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.label}>Email Address</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={17} color={C.textMuted} style={s.inputIcon} />
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="john.smith@example.com" placeholderTextColor={C.textMuted}
            selectionColor={C.brand} underlineColorAndroid="transparent" keyboardType="email-address" autoCapitalize="none" />
        </View>
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.label}>Phone Number</Text>
        <View style={s.inputWrap}>
          <Ionicons name="call-outline" size={17} color={C.textMuted} style={s.inputIcon} />
          <TextInput style={s.input} value={phone} onChangeText={setPhone}
            placeholder="+44 7700 900000" placeholderTextColor={C.textMuted}
            selectionColor={C.brand} underlineColorAndroid="transparent" keyboardType="phone-pad" />
        </View>
      </View>
    </View>
  );

  const renderDocuments = () => (
    <View>
      <Text style={s.stepTitle}>Upload Documents</Text>
      <Text style={s.stepSubtitle}>We need to verify your identity using a government-issued ID and proof of address.</Text>

      {/* Government ID */}
      <View style={s.docCard}>
        <View style={s.docHeader}>
          <View style={s.docIconWrap}>
            <Ionicons name="card-outline" size={20} color={C.brandLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.docTitle}>Government ID</Text>
            <Text style={s.docSubtitle}>Passport, Driving Licence, or National ID</Text>
          </View>
          {idDoc && <Ionicons name="checkmark-circle" size={22} color={C.income} />}
        </View>

        {idDoc ? (
          <View style={s.docUploaded}>
            <Ionicons name="document-text-outline" size={18} color={C.brandLight} />
            <Text style={s.docFileName} numberOfLines={1}>{idDoc.name}</Text>
            <TouchableOpacity onPress={() => setIdDoc(null)}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.docActions}>
            <TouchableOpacity style={s.uploadBtn} onPress={() => pickDocument(setIdDoc)}>
              <Ionicons name="cloud-upload-outline" size={17} color={C.brand} />
              <Text style={s.uploadBtnText}>Upload File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.demoBtn} onPress={() => setIdDoc({ name: 'passport_scan.jpg' })}>
              <Text style={s.demoBtnText}>Use Demo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Proof of Address */}
      <View style={s.docCard}>
        <View style={s.docHeader}>
          <View style={s.docIconWrap}>
            <Ionicons name="home-outline" size={20} color={C.brandLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.docTitle}>Proof of Address</Text>
            <Text style={s.docSubtitle}>Bank statement or utility bill (max 3 months old)</Text>
          </View>
          {addressDoc && <Ionicons name="checkmark-circle" size={22} color={C.income} />}
        </View>

        {addressDoc ? (
          <View style={s.docUploaded}>
            <Ionicons name="document-text-outline" size={18} color={C.brandLight} />
            <Text style={s.docFileName} numberOfLines={1}>{addressDoc.name}</Text>
            <TouchableOpacity onPress={() => setAddressDoc(null)}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.docActions}>
            <TouchableOpacity style={s.uploadBtn} onPress={() => pickDocument(setAddressDoc)}>
              <Ionicons name="cloud-upload-outline" size={17} color={C.brand} />
              <Text style={s.uploadBtnText}>Upload File</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.demoBtn} onPress={() => setAddressDoc({ name: 'bank_statement.pdf' })}>
              <Text style={s.demoBtnText}>Use Demo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={C.brandLight} />
        <Text style={s.infoText}>Documents are encrypted and stored securely in compliance with FCA regulations.</Text>
      </View>
    </View>
  );

  const renderFaceVerification = () => {
    const scanTranslateY = scanLineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 170],
    });

    const checks: { label: string; done: boolean }[] = [
      { label: 'Face detected', done: ['detecting', 'liveness', 'matching', 'done'].includes(faceState) },
      { label: 'Liveness confirmed', done: ['liveness', 'matching', 'done'].includes(faceState) },
      { label: 'Identity matched', done: ['matching', 'done'].includes(faceState) },
    ];

    const scanningLabel =
      faceState === 'scanning' ? 'Scanning face...' :
      faceState === 'detecting' ? 'Face detected' :
      faceState === 'liveness' ? 'Checking liveness...' :
      faceState === 'matching' ? 'Matching identity...' : '';

    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={s.stepTitle}>Face Verification</Text>
        <Text style={s.stepSubtitle}>Align your face within the oval and remain still.</Text>

        {/* Simulated camera viewport */}
        <View style={s.cameraView}>
          <View style={[s.corner, s.cTL]} />
          <View style={[s.corner, s.cTR]} />
          <View style={[s.corner, s.cBL]} />
          <View style={[s.corner, s.cBR]} />

          <View style={[s.faceOval, faceState === 'done' && { borderColor: C.income }]} />

          {['scanning', 'detecting', 'liveness', 'matching'].includes(faceState) && (
            <Animated.View style={[s.scanLine, { transform: [{ translateY: scanTranslateY }] }]} />
          )}

          {faceState === 'idle' && (
            <View style={s.faceIconWrap}>
              <Ionicons name="person-outline" size={44} color={C.textMuted} />
            </View>
          )}

          {faceState === 'done' && (
            <View style={s.faceIconWrap}>
              <Ionicons name="checkmark-circle" size={52} color={C.income} />
            </View>
          )}

          {scanningLabel !== '' && faceState !== 'done' && (
            <View style={s.scanLabel}>
              <ActivityIndicator size="small" color={C.brandLight} style={{ marginRight: 6 }} />
              <Text style={s.scanLabelText}>{scanningLabel}</Text>
            </View>
          )}
        </View>

        {/* Check items */}
        <View style={s.checkList}>
          {checks.map((c, i) => (
            <View key={i} style={s.checkRow}>
              <Ionicons
                name={c.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={c.done ? C.income : C.textMuted}
              />
              <Text style={[s.checkLabel, c.done && { color: C.textPrimary }]}>{c.label}</Text>
            </View>
          ))}
        </View>

        {faceState === 'idle' && (
          <TouchableOpacity style={s.scanBtn} onPress={startFaceScan}>
            <Ionicons name="camera-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.scanBtnText}>Start Face Scan</Text>
          </TouchableOpacity>
        )}

        {faceState === 'done' && (
          <View style={s.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={18} color={C.income} style={{ marginRight: 6 }} />
            <Text style={s.verifiedText}>Verification Complete</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTwoFA = () => (
    <View>
      <Text style={s.stepTitle}>Two-Factor Authentication</Text>
      <Text style={s.stepSubtitle}>We'll send a one-time code to verify your phone number.</Text>

      <View style={s.phoneRow}>
        <Ionicons name="phone-portrait-outline" size={20} color={C.brandLight} />
        <Text style={s.phoneText}>{phone || '+44 7700 900000'}</Text>
        <View style={s.phoneBadge}><Text style={s.phoneBadgeText}>Verified</Text></View>
      </View>

      {!otpSent ? (
        <>
          <Text style={s.otpHint}>
            A 6-digit code will be sent to your registered mobile number via SMS.
          </Text>
          <TouchableOpacity
            style={[s.primaryBtn, otpLoading && { opacity: 0.6 }]}
            onPress={sendOtp}
            disabled={otpLoading}
          >
            {otpLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.primaryBtnText}>Send Verification Code</Text>
                </>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={s.sentBanner}>
            <Ionicons name="checkmark-circle" size={16} color={C.income} style={{ marginRight: 6 }} />
            <Text style={s.sentText}>
              Code sent · Demo code:{' '}
              <Text style={{ color: C.brandLight, fontWeight: '700' }}>123456</Text>
            </Text>
          </View>

          <Text style={s.label}>Enter 6-digit code</Text>

          {/* OTP boxes — hidden input layered behind */}
          <View style={{ height: 56, marginBottom: 20 }}>
            <View style={s.otpRow} pointerEvents="none">
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[s.otpBox, !!otpCode[i] && s.otpBoxActive]}>
                  <Text style={s.otpDigit}>{otpCode[i] || ''}</Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={otpRef}
              style={s.otpHiddenInput}
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, otpCode.length < 6 && { opacity: 0.4 }]}
            onPress={verifyOtp}
            disabled={otpCode.length < 6}
          >
            <Text style={s.primaryBtnText}>Verify Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.resendRow} onPress={() => { setOtpCode(''); setOtpSent(false); }}>
            <Text style={s.resendText}>
              Didn't receive it?{' '}
              <Text style={{ color: C.brandLight }}>Resend code</Text>
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderProcessing = () => (
    <View style={{ alignItems: 'center' }}>
      <View style={s.doneCircle}>
        <Ionicons name="checkmark" size={48} color="#fff" />
      </View>
      <Text style={s.doneTitle}>Application Submitted</Text>
      <Text style={s.doneSubtitle}>
        Your account registration request is currently being processed by our team.
      </Text>

      {/* Progress timeline */}
      <View style={s.timeline}>
        {[
          { icon: 'person-outline' as const,          label: 'Personal details received' },
          { icon: 'card-outline' as const,             label: 'Documents uploaded' },
          { icon: 'scan-outline' as const,             label: 'Identity verified' },
          { icon: 'shield-checkmark-outline' as const, label: '2FA enabled' },
          { icon: 'hourglass-outline' as const,        label: 'Under review by our team', pending: true },
        ].map((item, i, arr) => (
          <View key={i}>
            <View style={s.tlRow}>
              <View style={[s.tlDot, !item.pending && s.tlDotDone]}>
                <Ionicons name={item.icon} size={13} color={item.pending ? C.textMuted : '#fff'} />
              </View>
              <Text style={[s.tlLabel, !item.pending && { color: C.textPrimary }]}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && (
              <View style={[s.tlConnector, !item.pending && s.tlConnectorDone]} />
            )}
          </View>
        ))}
      </View>

      <View style={s.infoBox}>
        <Ionicons name="mail-outline" size={16} color={C.brandLight} />
        <Text style={s.infoText}>
          We'll email{' '}
          <Text style={{ color: C.brandLight }}>{email || 'you'}</Text>
          {' '}once your account is approved (typically 2–3 business days).
        </Text>
      </View>

      <TouchableOpacity style={[s.primaryBtn, { marginTop: 24 }]} onPress={() => router.replace('/login')}>
        <Text style={s.primaryBtnText}>Return to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const isProcessing = step === 5;
  const isTwoFA = step === 4;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          {!isProcessing
            ? <TouchableOpacity onPress={goBack} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
              </TouchableOpacity>
            : <View style={{ width: 40 }} />
          }
          <Text style={s.headerTitle}>{isProcessing ? 'Application Status' : 'Create Account'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        {!isProcessing && (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
            </View>
            <Text style={s.progressLabel}>Step {step} of {TOTAL_STEPS}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            {step === 1 && renderPersonalDetails()}
            {step === 2 && renderDocuments()}
            {step === 3 && renderFaceVerification()}
            {step === 4 && renderTwoFA()}
            {step === 5 && renderProcessing()}
          </View>

          {/* Continue button — not shown on 2FA or processing (they handle their own CTAs) */}
          {!isProcessing && !isTwoFA && (
            <TouchableOpacity
              style={[s.primaryBtn, !canProceed() && { opacity: 0.4 }]}
              onPress={goNext}
              disabled={!canProceed()}
            >
              <Text style={s.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  progressWrap: { paddingHorizontal: 20, marginBottom: 6 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: C.brand, borderRadius: 2 },
  progressLabel: { fontSize: 11, color: C.textMuted, textAlign: 'right' },

  scroll: { padding: 20, paddingBottom: 48 },
  card: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 24, marginBottom: 16,
  },

  stepTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  stepSubtitle: { fontSize: 13, color: C.textMuted, marginBottom: 22, lineHeight: 18 },

  row: { flexDirection: 'row' },
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '600', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 2,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 10, backgroundColor: 'transparent', outlineWidth: 0 } as any,

  // Documents
  docCard: {
    backgroundColor: C.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 14,
  },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  docIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  docTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  docSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  docActions: { flexDirection: 'row', gap: 8 },
  uploadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.brandBg, borderRadius: 10,
    borderWidth: 1, borderColor: C.brandBorder, paddingVertical: 12,
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: C.brand },
  demoBtn: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
  },
  demoBtnText: { fontSize: 14, color: C.textSecondary },
  docUploaded: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.brandBg, borderRadius: 10, padding: 12,
  },
  docFileName: { flex: 1, fontSize: 13, color: C.brandLight },

  // Face verification
  cameraView: {
    width: 240, height: 310,
    backgroundColor: '#080e1a',
    borderRadius: 20, overflow: 'hidden',
    marginBottom: 24,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: C.brandLight, borderWidth: 2.5 },
  cTL: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cTR: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cBL: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cBR: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  faceOval: {
    width: 148, height: 190,
    borderRadius: 74, borderWidth: 2.5,
    borderColor: C.brandLight, borderStyle: 'dashed',
  },
  scanLine: {
    position: 'absolute', top: 60,
    left: 46, right: 46, height: 2,
    backgroundColor: C.brandLight, opacity: 0.85,
  },
  faceIconWrap: { position: 'absolute' },
  scanLabel: {
    position: 'absolute', bottom: 18,
    flexDirection: 'row', alignItems: 'center',
  },
  scanLabelText: { fontSize: 12, color: C.brandLight },

  checkList: { width: '100%', marginBottom: 22, gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: 14, color: C.textMuted },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.brand, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14,
  },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.incomeBg, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20,
    borderWidth: 1, borderColor: C.incomeBorder,
  },
  verifiedText: { fontSize: 15, fontWeight: '600', color: C.income },

  // 2FA
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    padding: 14, marginBottom: 16,
  },
  phoneText: { flex: 1, fontSize: 16, color: C.textPrimary, fontWeight: '500' },
  phoneBadge: {
    backgroundColor: C.incomeBg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.incomeBorder,
  },
  phoneBadgeText: { fontSize: 11, fontWeight: '600', color: C.income },
  otpHint: { fontSize: 13, color: C.textMuted, marginBottom: 20, lineHeight: 18 },
  sentBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.incomeBg, borderRadius: 10,
    padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: C.incomeBorder,
  },
  sentText: { fontSize: 13, color: C.textSecondary },
  otpRow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  otpBox: {
    width: 46, height: 56, borderRadius: 12,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxActive: { borderColor: C.brand, backgroundColor: C.brandBg },
  otpDigit: { fontSize: 22, fontWeight: '700', color: C.textPrimary },
  otpHiddenInput: { height: 56, width: '100%', opacity: 0 },
  resendRow: { alignItems: 'center', marginTop: 14 },
  resendText: { fontSize: 13, color: C.textMuted },

  // Processing
  doneCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.income,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  doneTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 8, textAlign: 'center' },
  doneSubtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 20 },

  timeline: { width: '100%', marginBottom: 20 },
  tlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tlDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.border, borderWidth: 1.5, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tlDotDone: { backgroundColor: C.brand, borderColor: C.brand },
  tlConnector: { width: 2, height: 10, backgroundColor: C.border, marginLeft: 14, marginVertical: 1 },
  tlConnectorDone: { backgroundColor: C.brand },
  tlLabel: { fontSize: 14, color: C.textMuted },

  // Shared
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.brandBg, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: C.brandBorder,
    marginTop: 4,
  },
  infoText: { fontSize: 12, color: C.textSecondary, flex: 1, lineHeight: 17 },

  demoFillBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: C.brandBg, borderRadius: 10,
    borderWidth: 1, borderColor: C.brandBorder,
    paddingVertical: 8, paddingHorizontal: 14, marginBottom: 20,
  },
  demoFillBtnText: { fontSize: 13, fontWeight: '600', color: C.brand },

  primaryBtn: {
    backgroundColor: C.brand, padding: 15, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

import Logo from '@/app/components/Logo';
import { C } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Step = 'credentials' | 'mfa';
type FaceState = 'idle' | 'scanning' | 'success';

const MOCK_USERNAME = 'customer';
const MOCK_PASSWORD = 'customer123';
const MFA_CODE = '123456';
const MASKED_PHONE = '+44 7700 9004••';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  // Step 1
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Step 2
  const [step, setStep] = useState<Step>('credentials');
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsError, setSmsError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Reset to credentials step every time this screen gains focus (e.g. after sign-out)
  useFocusEffect(useCallback(() => {
    setStep('credentials');
    setFaceState('idle');
    setSmsSent(false);
    setSmsCode('');
    setSmsError('');
    setMfaLoading(false);
  }, []));

  // Face ID animations
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (faceState === 'scanning') {
      pulseRef.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringScale, { toValue: 1.25, duration: 850, useNativeDriver: true }),
            Animated.timing(ringScale, { toValue: 1, duration: 850, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity, { toValue: 1, duration: 850, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.2, duration: 850, useNativeDriver: true }),
          ]),
        ])
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      ringScale.setValue(1);
      ringOpacity.setValue(0.4);
    }
  }, [faceState]);

  useEffect(() => {
    if (faceState === 'success') {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [faceState]);

  // Step 1: validate credentials locally, don't call login() yet
  const handleCredentials = () => {
    setUsernameError('');
    setPasswordError('');
    if (!username.trim()) { setUsernameError('Please enter your username.'); return; }
    if (!password.trim()) { setPasswordError('Please enter your password.'); return; }
    if (username.toLowerCase().trim() !== MOCK_USERNAME) {
      setUsernameError('No account found with that username.');
      return;
    }
    if (password.trim() !== MOCK_PASSWORD) {
      setPasswordError('Incorrect password. Please try again.');
      return;
    }
    setStep('mfa');
  };

  // Called after MFA passes — actually sets the user
  const completeMfa = async () => {
    setMfaLoading(true);
    await login(username, password);
    router.replace('/(tabs)');
  };

  const handleFaceId = () => {
    if (faceState !== 'idle') return;
    setFaceState('scanning');
    setTimeout(() => {
      setFaceState('success');
      setTimeout(() => completeMfa(), 900);
    }, 1800);
  };

  const handleSendCode = () => {
    setSmsSent(true);
    setSmsCode('');
    setSmsError('');
  };

  const handleVerifyCode = async () => {
    if (smsCode.trim() !== MFA_CODE) {
      setSmsError('Incorrect code. Please try again.');
      return;
    }
    await completeMfa();
  };

  const resetMfa = () => {
    setStep('credentials');
    setFaceState('idle');
    setSmsSent(false);
    setSmsCode('');
    setSmsError('');
  };

  // ─── Step 2: MFA screen ───────────────────────────────────────────────────

  if (step === 'mfa') {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          <View style={s.brandWrap}>
            <Logo height={48} />
          </View>

          <View style={s.card}>
            {/* Header */}
            <View style={s.mfaHeaderRow}>
              <View style={s.mfaShieldWrap}>
                <Ionicons name="shield-checkmark" size={22} color={C.brandLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Two-step verification</Text>
                <Text style={s.mfaSubtitle}>Confirm it's really you to continue.</Text>
              </View>
            </View>

            {/* Face ID section */}
            <View style={s.faceSection}>
              {/* Animated ring + icon */}
              <View style={s.faceWrap}>
                <Animated.View
                  style={[
                    s.faceRing,
                    {
                      transform: [{ scale: ringScale }],
                      opacity: ringOpacity,
                      borderColor: faceState === 'scanning' ? C.brandLight : C.brand,
                    },
                  ]}
                />
                <View style={s.faceCircle}>
                  {faceState === 'success' ? (
                    <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                      <Ionicons name="checkmark-circle" size={54} color={C.income} />
                    </Animated.View>
                  ) : (
                    <Ionicons
                      name="scan-outline"
                      size={48}
                      color={faceState === 'scanning' ? C.brandLight : C.textMuted}
                    />
                  )}
                </View>
              </View>

              {faceState === 'idle' && (
                <>
                  <Text style={s.faceTitle}>Face ID</Text>
                  <Text style={s.faceSub}>Instant biometric authentication</Text>
                  <Pressable style={s.faceBtn} onPress={handleFaceId}>
                    <Ionicons name="scan-outline" size={17} color="#fff" />
                    <Text style={s.faceBtnText}>Use Face ID</Text>
                  </Pressable>
                </>
              )}

              {faceState === 'scanning' && (
                <>
                  <Text style={[s.faceTitle, { color: C.brandLight }]}>Scanning…</Text>
                  <Text style={s.faceSub}>Hold still</Text>
                </>
              )}

              {faceState === 'success' && (
                <>
                  <Text style={[s.faceTitle, { color: C.income }]}>Identity confirmed</Text>
                  <Text style={s.faceSub}>Signing you in…</Text>
                </>
              )}
            </View>

            {/* Only show SMS when Face ID isn't active */}
            {faceState === 'idle' && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* SMS section */}
                <View style={s.smsSection}>
                  <View style={s.smsHeaderRow}>
                    <View style={s.smsIconWrap}>
                      <Ionicons name="phone-portrait-outline" size={19} color={C.brandLight} />
                    </View>
                    <View>
                      <Text style={s.smsTitle}>SMS Code</Text>
                      <Text style={s.smsSub}>{MASKED_PHONE}</Text>
                    </View>
                  </View>

                  {!smsSent ? (
                    <Pressable style={s.sendBtn} onPress={handleSendCode}>
                      <Ionicons name="send-outline" size={15} color={C.brandLight} />
                      <Text style={s.sendBtnText}>Send verification code</Text>
                    </Pressable>
                  ) : (
                    <>
                      <View style={s.codeSentRow}>
                        <Ionicons name="checkmark-circle-outline" size={15} color={C.income} />
                        <Text style={s.codeSentText}>Code sent to {MASKED_PHONE}</Text>
                      </View>
                      <Text style={s.codeHint}>Demo code: 123456</Text>

                      <TextInput
                        style={[s.codeInput, !!smsError && s.codeInputError]}
                        value={smsCode}
                        onChangeText={(v) => { setSmsCode(v.replace(/\D/g, '').slice(0, 6)); setSmsError(''); }}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor={C.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        selectionColor={C.brand}
                      />

                      {!!smsError && (
                        <View style={s.errorRow}>
                          <Ionicons name="alert-circle-outline" size={13} color={C.destructive} />
                          <Text style={s.errorText}>{smsError}</Text>
                        </View>
                      )}

                      <Pressable
                        style={[s.verifyBtn, (smsCode.length !== 6 || mfaLoading) && { opacity: 0.5 }]}
                        onPress={handleVerifyCode}
                        disabled={smsCode.length !== 6 || mfaLoading}
                      >
                        {mfaLoading
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={s.verifyBtnText}>Verify</Text>
                        }
                      </Pressable>
                    </>
                  )}
                </View>
              </>
            )}
          </View>

          {faceState === 'idle' && (
            <Pressable style={s.backBtn} onPress={resetMfa}>
              <Ionicons name="arrow-back-outline" size={15} color={C.textMuted} />
              <Text style={s.backBtnText}>Back to sign in</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Step 1: credentials ──────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <View style={s.brandWrap}>
          <Logo height={52} />
          <Text style={s.tagline}>Secure access to your financial dashboard</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sign in</Text>

          <Text style={s.label}>Username</Text>
          <View style={[s.inputWrap, !!usernameError && s.inputWrapError]}>
            <Ionicons name="person-outline" size={17} color={usernameError ? C.destructive : C.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={username}
              onChangeText={(v) => { setUsername(v); setUsernameError(''); }}
              placeholder="Enter your username"
              placeholderTextColor={C.textMuted}
              selectionColor={C.brand}
              underlineColorAndroid="transparent"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>
          {!!usernameError && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color={C.destructive} />
              <Text style={s.errorText}>{usernameError}</Text>
            </View>
          )}

          <Text style={[s.label, { marginTop: 4 }]}>Password</Text>
          <View style={[s.inputWrap, !!passwordError && s.inputWrapError]}>
            <Ionicons name="lock-closed-outline" size={17} color={passwordError ? C.destructive : C.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={password}
              onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
              placeholder="Enter your password"
              placeholderTextColor={C.textMuted}
              selectionColor={C.brand}
              underlineColorAndroid="transparent"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleCredentials}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
            </Pressable>
          </View>
          {!!passwordError && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color={C.destructive} />
              <Text style={s.errorText}>{passwordError}</Text>
            </View>
          )}

          <Pressable
            style={[s.loginBtn, loading && { opacity: 0.6 }]}
            onPress={handleCredentials}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.loginBtnText}>Continue</Text>
            }
          </Pressable>

          <Pressable
            style={s.demoBtn}
            onPress={() => { setUsername('customer'); setPassword('customer123'); setUsernameError(''); setPasswordError(''); }}
          >
            <Ionicons name="flash-outline" size={15} color={C.brand} style={{ marginRight: 6 }} />
            <Text style={s.demoBtnText}>Fill in demo info</Text>
          </Pressable>
        </View>

        <View style={s.registerWrap}>
          <Text style={s.registerPrompt}>Don't have an account?</Text>
          <Pressable style={s.registerBtn} onPress={() => router.push('/register')}>
            <Ionicons name="person-add-outline" size={17} color={C.brand} style={{ marginRight: 6 }} />
            <Text style={s.registerBtnText}>Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },

  brandWrap: { alignItems: 'center', marginBottom: 32, gap: 12 },
  tagline: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 2 },
  inputWrapError: { borderBottomColor: C.destructive },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, marginTop: 4 },
  errorText: { fontSize: 12, color: C.destructive },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 10, backgroundColor: 'transparent', outlineWidth: 0 } as any,
  eyeBtn: { padding: 14 },
  loginBtn: { backgroundColor: C.brand, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  demoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.brandBg, borderRadius: 10,
    borderWidth: 1, borderColor: C.brandBorder,
    paddingVertical: 10, marginTop: 14,
  },
  demoBtnText: { fontSize: 13, fontWeight: '600', color: C.brand },

  registerWrap: { alignItems: 'center', marginTop: 24, gap: 10 },
  registerPrompt: { fontSize: 13, color: C.textMuted },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.brandBorder,
    paddingVertical: 13, paddingHorizontal: 28,
  },
  registerBtnText: { fontSize: 15, fontWeight: '600', color: C.brand },

  // ─── MFA styles ────────────────────────────────────────────────────────────

  mfaHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  mfaShieldWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  mfaSubtitle: { fontSize: 13, color: C.textMuted, lineHeight: 18 },

  // Face ID
  faceSection: { alignItems: 'center', paddingVertical: 8 },
  faceWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  faceRing: {
    position: 'absolute',
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 2.5, borderColor: C.brand,
  },
  faceCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.brandBg, borderWidth: 1.5, borderColor: C.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  faceTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  faceSub: { fontSize: 13, color: C.textMuted, marginBottom: 16 },
  faceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.brand, paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14,
  },
  faceBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.textMuted, fontWeight: '500' },

  // SMS
  smsSection: { gap: 12 },
  smsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smsIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  smsTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  smsSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.brandBorder, borderRadius: 12,
    paddingVertical: 12, backgroundColor: C.brandBg,
  },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: C.brandLight },
  codeSentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeSentText: { fontSize: 13, color: C.income, fontWeight: '500' },
  codeHint: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
  codeInput: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 20, fontWeight: '700', color: C.textPrimary,
    letterSpacing: 6, textAlign: 'center',
  },
  codeInputError: { borderColor: C.destructive },
  verifyBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 8 },
  backBtnText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
});

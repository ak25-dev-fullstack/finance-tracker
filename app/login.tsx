import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { C } from '@/constants/theme';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = async () => {
    setUsernameError('');
    setPasswordError('');

    if (!username.trim()) { setUsernameError('Please enter your username.'); return; }
    if (!password.trim()) { setPasswordError('Please enter your password.'); return; }

    setLoading(true);
    const result = await login(username.trim(), password.trim());
    setLoading(false);

    if (result === 'unknown_user') {
      setUsernameError('No account found with that username.');
    } else if (result === 'wrong_password') {
      setPasswordError('Incorrect password. Please try again.');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
          <View style={s.brandWrap}>
            <View style={s.logoCircle}>
              <Ionicons name="wallet" size={32} color="#fff" />
            </View>
            <Text style={s.brand}>DWK Finance</Text>
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
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            {!!passwordError && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={C.destructive} />
                <Text style={s.errorText}>{passwordError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={s.demoBtn}
              onPress={() => { setUsername('customer'); setPassword('customer123'); setUsernameError(''); setPasswordError(''); }}
            >
              <Ionicons name="flash-outline" size={15} color={C.brand} style={{ marginRight: 6 }} />
              <Text style={s.demoBtnText}>Fill in demo info</Text>
            </TouchableOpacity>
          </View>

          {/* Register CTA */}
          <View style={s.registerWrap}>
            <Text style={s.registerPrompt}>Don't have an account?</Text>
            <TouchableOpacity style={s.registerBtn} onPress={() => router.push('/register')}>
              <Ionicons name="person-add-outline" size={17} color={C.brand} style={{ marginRight: 6 }} />
              <Text style={s.registerBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },

  brandWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  brand: { fontSize: 26, fontWeight: '700', color: C.textPrimary },
  tagline: { fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center' },

  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 2 },
  inputWrapError: { borderBottomColor: C.destructive },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, marginTop: 4 },
  errorText: { fontSize: 12, color: C.destructive },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 10, backgroundColor: 'transparent', outlineWidth: 0 } as any,
  eyeBtn: { padding: 14 },
  loginBtn: { backgroundColor: C.brand, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
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
});

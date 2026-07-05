import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import config from '@/config';
import { login } from '@/services/cognee';

const BG     = '#000';
const CARD   = '#1C1C1E';
const TEXT   = '#fff';
const MUTED  = '#888';
const PURPLE = '#7C5CFC';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail]         = useState(config.AUTH_EMAIL);
  const [password, setPassword]   = useState(config.AUTH_PASSWORD);
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Auto-login with config credentials on mount
  useEffect(() => { handleLogin(); }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        {/* Wolf logo */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Heading */}
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Log in to continue</Text>

        {/* Inputs */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color={MUTED} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={MUTED} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} activeOpacity={0.7}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Log In button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={BG} />
            : <Text style={styles.loginBtnText}>Log In</Text>
          }
        </TouchableOpacity>

        {/* Sign up */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.poweredBy}>
          Powered by <Text style={styles.cognee}>Cognee</Text>
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 0,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 24,
  },
  heading: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subheading: {
    color: MUTED,
    fontSize: 15,
    marginBottom: 36,
  },
  form: {
    width: '100%',
    gap: 12,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  inputIcon: {
    width: 22,
  },
  input: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    paddingVertical: 0,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotText: {
    color: MUTED,
    fontSize: 13,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  loginBtn: {
    backgroundColor: TEXT,
    borderRadius: 999,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginBtnText: {
    color: BG,
    fontSize: 17,
    fontWeight: '700',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: MUTED,
    fontSize: 14,
  },
  signupLink: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  poweredBy: {
    color: '#444',
    fontSize: 13,
    position: 'absolute',
    bottom: 24,
  },
  cognee: {
    color: PURPLE,
    fontWeight: '700',
  },
});

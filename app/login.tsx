import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 🚀 เช็คว่ากรอกครบไหม ถ้าครบถึงจะให้ปุ่มทำงาน
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false); 
        // 🚀 ดักจับ Error รหัสผ่านผิดแล้วแปลเป็นไทย
        let errorMessage = error.message;
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        }
        Alert.alert('เข้าสู่ระบบล้มเหลว', errorMessage);
        return;
      }
      
      setLoading(false); 
      router.replace('/'); 
      
    } catch (error: any) {
      setLoading(false); 
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อระบบได้');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
        
        <View style={styles.topBackground}>
          <View style={styles.graphicCircle1} />
          <View style={styles.graphicCircle2} />
          <SafeAreaView edges={['top']}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="train" size={60} color="#FFF" />
              <Text style={styles.logoText}>RailGo</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.pageTitle}>Login</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="abasdrun.mae@spumail.net" placeholderTextColor="#BDBDBD" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#BDBDBD" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#757575" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>Remember</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>
          </View>

          {/* 🚀 ปุ่มจะจางลงถ้ากรอกข้อมูลไม่ครบ */}
          <TouchableOpacity 
            style={[styles.primaryBtn, (!isFormValid || loading) && {opacity: 0.5}]} 
            onPress={handleLogin} 
            disabled={!isFormValid || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>เข้าสู่ระบบ</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={20} color="#DB4437" style={{marginRight: 10}} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={20} color="#4267B2" style={{marginRight: 10}} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}>สมัครสมาชิก</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContainer: { flexGrow: 1 },
  // 🚀 แก้บั๊ก Scroll โดยการ Fix ความสูงพื้นหลัง
  topBackground: { height: height * 0.35, backgroundColor: '#262956', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  graphicCircle1: { position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  graphicCircle2: { position: 'absolute', bottom: -100, left: -50, width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  logoContainer: { alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  
  // 🚀 เอา flex: 1 ออก เพื่อให้กล่องยืดตามเนื้อหา และเพิ่ม paddingBottom
  bottomCard: { minHeight: height * 0.65, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, marginTop: -30, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, paddingBottom: 50 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#757575', marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 15, paddingHorizontal: 15, height: 50, backgroundColor: '#FFF' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  eyeIcon: { padding: 5 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#5E35B1', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#5E35B1' },
  rememberText: { fontSize: 12, color: '#757575' },
  forgotText: { fontSize: 12, color: '#5E35B1', fontWeight: 'bold' },
  primaryBtn: { backgroundColor: '#5E35B1', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 15, color: '#9E9E9E', fontSize: 12 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 25, marginHorizontal: 5 },
  socialBtnText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#757575' },
  footerLink: { fontSize: 12, color: '#5E35B1', fontWeight: 'bold' },
});
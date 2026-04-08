import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// 🔴 เช็ค Path ให้ตรงกับที่มึงวางไฟล์ supabase.js ด้วยนะ!
import { supabase } from '../supabase'; 

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🧙‍♂️ ฟังก์ชันสมัครสมาชิกผ่าน Supabase
  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน กรุณาเช็คอีกรอบนะพี่ยอน!');
      return;
    }
    if (password.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องยาว 6 ตัวอักษรขึ้นไป');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        // ยัดชื่อจริงลง Database ไปด้วยเลย
        data: {
          full_name: fullName.trim(),
        }
      }
    });

    if (error) {
      Alert.alert('สมัครสมาชิกล้มเหลว', error.message);
    } else {
      Alert.alert(
        'สมัครสำเร็จ!',
        'ระบบสร้างบัญชีให้มึงแล้ว ไปล็อกอินลุยกันต่อเลย!',
        [{ text: 'ตกลง', onPress: () => router.replace('/login') }]
      );
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 🔙 ปุ่มย้อนกลับ & โลโก้ */}
          <View style={styles.headerSection}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Ionicons name="person-add" size={50} color="#4A148C" />
              <Text style={styles.logoText}>Create Account</Text>
            </View>
          </View>

          {/* 📝 ส่วนกรอกข้อมูล */}
          <View style={styles.formSection}>
            
            {/* ช่องชื่อ-นามสกุล */}
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="John Doe"
                placeholderTextColor="#9E9E9E"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* ช่อง Email */}
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="abasdrun.mae@spumail.net"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* ช่อง Password */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9E9E9E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#333" />
              </TouchableOpacity>
            </View>

            {/* ช่อง Confirm Password */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="checkmark-done-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9E9E9E"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

          </View>

          {/* 🔘 ปุ่ม Sign Up หลัก */}
          <TouchableOpacity 
            style={[styles.signupBtn, loading && styles.signupBtnDisabled]} 
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupBtnText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          {/* ลิงก์ไปหน้า Login */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.alreadyAccountText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginTabText}>Log In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 📐 Style โคลนนิ่งมาจากหน้า Login เป๊ะๆ คลีนๆ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 30 },
  
  headerSection: { marginBottom: 30 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  logoContainer: { alignItems: 'center', flexDirection: 'column', justifyContent: 'center' },
  logoText: { fontSize: 24, fontWeight: '900', color: '#4A148C', marginTop: 10 },
  
  formSection: { marginBottom: 30 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, height: 55, marginBottom: 20, borderWidth: 1, borderColor: '#BDBDBD' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333' },
  
  signupBtn: { width: '100%', height: 55, backgroundColor: '#5E35B1', borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#5E35B1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  signupBtnDisabled: { backgroundColor: '#9E9E9E' },
  signupBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  
  loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  alreadyAccountText: { color: '#757575', fontSize: 14 },
  loginTabText: { color: '#5E35B1', fontSize: 14, fontWeight: 'bold' },
});
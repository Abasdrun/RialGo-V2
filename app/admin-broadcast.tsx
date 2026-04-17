import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

export default function AdminBroadcastScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notiType, setNotiType] = useState('info'); // info, success, warning, danger
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  // 🚀 ดึงจำนวนผู้ใช้งานทั้งหมดแบบ Real-time ตอนเปิดหน้ามา
  useEffect(() => {
    const fetchUserCount = async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setTotalUsers(count || 0);
    };
    fetchUserCount();
  }, []);

  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกหัวข้อและรายละเอียดข้อความให้ครบ!');
      return;
    }

    Alert.alert('ยืนยันการส่งข้อความ', `ระบบจะส่งข้อความนี้ไปยังผู้ใช้งานทั้งหมด ${totalUsers.toLocaleString()} คน ทันที\nคุณแน่ใจหรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ส่งกระจายเสียง', 
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);

            const { data: users, error: fetchError } = await supabase.from('profiles').select('id');
            if (fetchError) throw fetchError;
            if (!users || users.length === 0) {
              Alert.alert('แจ้งเตือน', 'ไม่พบผู้ใช้งานในระบบ');
              return;
            }

            const notificationsToInsert = users.map((user) => ({
              user_id: user.id,
              title: title,
              message: message,
              type: notiType,
            }));

            const { error: insertError } = await supabase.from('notifications').insert(notificationsToInsert);
            if (insertError) throw insertError;

            Alert.alert('สำเร็จ! 🎉', `ส่งข้อความหาผู้ใช้งานจำนวน ${users.length.toLocaleString()} คน เรียบร้อยแล้ว!`);
            
            setTitle('');
            setMessage('');
            setNotiType('info');
            router.back(); // ส่งเสร็จแล้วเด้งกลับหน้าหลัก

          } catch (error: any) {
            Alert.alert('เกิดข้อผิดพลาด', error.message);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* 👑 Header สีน้ำเงินเข้ม */}
        <View style={styles.headerBg}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitleCenter}>Admin</Text>
              <View style={{width: 40}} />
            </View>
          </SafeAreaView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 📝 การ์ดฟอร์มหลักสีขาว (ซ้อนทับ Header) */}
          <View style={styles.formCard}>
            
            <View style={styles.cardHeader}>
              <Text style={styles.mainTitle}>ส่งข่าวสาร (Broadcast)</Text>
              <Text style={styles.subTitle}>ส่งการแจ้งเตือนไปยังผู้ใช้ทั้งหมด</Text>
            </View>

            <View style={styles.iconWrapper}>
              <View style={styles.iconBg}>
                <Ionicons name="volume-medium" size={28} color="#5E35B1" />
              </View>
            </View>
            
            <Text style={styles.userCountText}>
              ส่งการแจ้งเตือนให้ผู้ใช้ทั้งหมด <Text style={styles.highlightText}>{totalUsers.toLocaleString()} คน</Text>
            </Text>

            {/* Input หัวข้อ */}
            <Text style={styles.label}>หัวข้อการแจ้งเตือน (Title)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="เช่น : ประกาศสำคัญ" 
              placeholderTextColor="#9E9E9E"
              value={title}
              onChangeText={setTitle}
            />

            {/* Input รายละเอียด */}
            <Text style={styles.label}>รายละเอียด (Message)</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="พิมพ์ข้อความ...." 
              placeholderTextColor="#9E9E9E"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />

            {/* เลือกประเภทการแจ้งเตือน */}
            <Text style={styles.label}>ประเภทการแจ้งเตือน</Text>
            <View style={styles.typeContainer}>
              
              <TouchableOpacity style={[styles.typeBox, notiType === 'info' && styles.typeActive]} onPress={() => setNotiType('info')}>
                <View style={[styles.typeDot, {backgroundColor: '#42A5F5'}]} />
                <Text style={[styles.typeText, notiType === 'info' && styles.typeTextActive]}>ทั่วไป</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'success' && styles.typeActive]} onPress={() => setNotiType('success')}>
                <View style={[styles.typeDot, {backgroundColor: '#4CAF50'}]} />
                <Text style={[styles.typeText, notiType === 'success' && styles.typeTextActive]}>สำเร็จ/โปรโมชั่น</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'warning' && styles.typeActive]} onPress={() => setNotiType('warning')}>
                <View style={[styles.typeDot, {backgroundColor: '#FFCA28'}]} />
                <Text style={[styles.typeText, notiType === 'warning' && styles.typeTextActive]}>แจ้งเตือน</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'danger' && styles.typeActive]} onPress={() => setNotiType('danger')}>
                <View style={[styles.typeDot, {backgroundColor: '#EF5350'}]} />
                <Text style={[styles.typeText, notiType === 'danger' && styles.typeTextActive]}>ด่วน/สำคัญ</Text>
              </TouchableOpacity>

            </View>

            {/* แถบคำเตือนสีเหลือง */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={20} color="#F57F17" style={{marginRight: 10}} />
              <Text style={styles.warningText}>การส่ง Broadcast จะส่งไปยังผู้ใช้งานทั้งหมดทันที ไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลก่อนส่ง</Text>
            </View>

            {/* ปุ่มกดยืนยัน / ยกเลิก */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sendBtn, loading && {backgroundColor: '#9E9E9E'}]} 
                onPress={handleBroadcast}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="volume-medium" size={16} color="#FFF" style={{marginRight: 6}} />
                    <Text style={styles.sendBtnText}>ส่งข่าวสาร (Broadcast Now)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  
  // Header โทนน้ำเงิน
  headerBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 60, overflow: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitleCenter: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingTop: 120, paddingBottom: 50 },
  
  // การ์ดสีขาวซ้อนทับ
  formCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: {width: 0, height: 5} },
  cardHeader: { marginBottom: 20 },
  mainTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 12, color: '#757575', marginTop: 4 },

  iconWrapper: { alignItems: 'center', marginBottom: 10 },
  iconBg: { backgroundColor: '#EBE4FF', width: 60, height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  userCountText: { textAlign: 'center', fontSize: 12, color: '#757575', marginBottom: 25 },
  highlightText: { color: '#5E35B1', fontWeight: 'bold' },

  // Inputs
  label: { color: '#333', fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#FFF', color: '#333', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, marginBottom: 15 },
  textArea: { height: 100, paddingTop: 15 },

  // Select Type
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  typeBox: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10 },
  typeActive: { backgroundColor: '#F3E5F5', borderColor: '#5E35B1' },
  typeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  typeText: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  typeTextActive: { color: '#5E35B1' },

  // Warning Banner
  warningBanner: { flexDirection: 'row', backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFD54F', padding: 15, borderRadius: 12, marginBottom: 25, alignItems: 'flex-start' },
  warningText: { flex: 1, color: '#F57F17', fontSize: 11, lineHeight: 18 },

  // Action Buttons
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { flex: 0.35, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 14, borderRadius: 15, alignItems: 'center', marginRight: 10 },
  cancelBtnText: { color: '#757575', fontSize: 14, fontWeight: 'bold' },
  
  sendBtn: { flex: 0.65, flexDirection: 'row', backgroundColor: '#5E35B1', paddingVertical: 14, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' }
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

export default function AdminBroadcastScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notiType, setNotiType] = useState('info'); // info, success, warning, ticket
  const [loading, setLoading] = useState(false);

  // 🚀 ฟังก์ชันกวาดรายชื่อแล้วยิงแจ้งเตือนทีเดียวทุกคน!
  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกหัวข้อและรายละเอียดข้อความให้ครบ!');
      return;
    }

    Alert.alert('ยืนยันการส่งข้อความ', 'ระบบจะส่งข้อความนี้ไปยังผู้ใช้งาน "ทุกคน" ในระบบ\nคุณแน่ใจหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ส่งกระจายเสียง', 
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);

            // 1. ดึง ID ของผู้ใช้ทุกคนในระบบจากตาราง profiles
            const { data: users, error: fetchError } = await supabase.from('profiles').select('id');
            if (fetchError) throw fetchError;
            if (!users || users.length === 0) {
              Alert.alert('แจ้งเตือน', 'ไม่พบผู้ใช้งานในระบบที่จะส่งข้อความหาได้');
              return;
            }

            // 2. จับคู่ข้อมูลเตรียมยิง (Bulk Insert)
            const notificationsToInsert = users.map((user) => ({
              user_id: user.id,
              title: title,
              message: message,
              type: notiType,
            }));

            // 3. ยิงเข้าตาราง notifications ตูมเดียวจบ!
            const { error: insertError } = await supabase.from('notifications').insert(notificationsToInsert);
            if (insertError) throw insertError;

            Alert.alert('สำเร็จ! 🎉', `ส่งข้อความหาผู้ใช้งานจำนวน ${users.length} คน เรียบร้อยแล้ว!`);
            
            // ล้างฟอร์ม
            setTitle('');
            setMessage('');
            setNotiType('info');

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* 👑 Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>กระจายข่าวสาร (Broadcast)</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.iconHeaderBox}>
            <Ionicons name="megaphone" size={50} color="#FF9800" />
            <Text style={styles.subTitle}>ส่งข้อความแจ้งเตือนหาทุกคน</Text>
          </View>

          <View style={styles.formCard}>
            
            <Text style={styles.label}>หัวข้อการแจ้งเตือน (Title)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="เช่น: 🚨 ด่วน! แจ้งเตือนรถไฟล่าช้า" 
              placeholderTextColor="#757575"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>รายละเอียด (Message)</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="พิมพ์รายละเอียดเนื้อหาที่ต้องการแจ้งให้ผู้โดยสารทราบ..." 
              placeholderTextColor="#757575"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>ประเภทไอคอนแจ้งเตือน (Type)</Text>
            <View style={styles.typeContainer}>
              
              <TouchableOpacity style={[styles.typeBox, notiType === 'info' && styles.typeActiveInfo]} onPress={() => setNotiType('info')}>
                <Ionicons name="information-circle" size={24} color={notiType === 'info' ? "#FFF" : "#2196F3"} />
                <Text style={[styles.typeText, notiType === 'info' && {color: '#FFF'}]}>ทั่วไป</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'success' && styles.typeActiveSuccess]} onPress={() => setNotiType('success')}>
                <Ionicons name="checkmark-circle" size={24} color={notiType === 'success' ? "#FFF" : "#4CAF50"} />
                <Text style={[styles.typeText, notiType === 'success' && {color: '#FFF'}]}>สำเร็จ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'warning' && styles.typeActiveWarning]} onPress={() => setNotiType('warning')}>
                <Ionicons name="warning" size={24} color={notiType === 'warning' ? "#FFF" : "#FF9800"} />
                <Text style={[styles.typeText, notiType === 'warning' && {color: '#FFF'}]}>ด่วน/เตือน</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.typeBox, notiType === 'ticket' && styles.typeActiveTicket]} onPress={() => setNotiType('ticket')}>
                <Ionicons name="ticket" size={24} color={notiType === 'ticket' ? "#FFF" : "#5E35B1"} />
                <Text style={[styles.typeText, notiType === 'ticket' && {color: '#FFF'}]}>โปรโมชั่น</Text>
              </TouchableOpacity>

            </View>

            <TouchableOpacity 
              style={[styles.sendBtn, loading && {backgroundColor: '#757575'}]} 
              onPress={handleBroadcast}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="send" size={20} color="#FFF" style={{marginRight: 10}} />
                  <Text style={styles.sendBtnText}>ส่งข้อความ (Broadcast Now)</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1E36' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  iconHeaderBox: { alignItems: 'center', marginBottom: 30 },
  subTitle: { color: '#AAA', fontSize: 14, marginTop: 10 },

  formCard: { backgroundColor: '#2A2C49', borderRadius: 25, padding: 25, elevation: 5 },
  label: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  input: { backgroundColor: '#1C1E36', color: '#FFF', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 15, borderWidth: 1, borderColor: '#3A3C59', fontSize: 14, marginBottom: 15 },
  textArea: { height: 120, paddingTop: 15 },

  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  typeBox: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1E36', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#3A3C59', marginBottom: 10 },
  typeText: { color: '#AAA', fontSize: 12, fontWeight: 'bold', marginLeft: 10 },
  
  typeActiveInfo: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  typeActiveSuccess: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  typeActiveWarning: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  typeActiveTicket: { backgroundColor: '#5E35B1', borderColor: '#5E35B1' },

  sendBtn: { flexDirection: 'row', backgroundColor: '#FF9800', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#FF9800', shadowOpacity: 0.4, shadowOffset: {width: 0, height: 4} },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
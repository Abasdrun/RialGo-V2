import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router'; // 📌 เพิ่ม useFocusEffect
import { supabase } from '../supabase';

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 States สำหรับ Modal ฟอร์ม (เพิ่ม/แก้ไข)
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(''); 
  const [expDate, setExpDate] = useState('');
  const [color, setColor] = useState('#5E35B1');

  // 🚀 บังคับให้ดึงข้อมูล "ทุกครั้ง" ที่เปิดเข้ามาหน้านี้!
  useFocusEffect(
    useCallback(() => {
      fetchCoupons();
    }, [])
  );

  const fetchCoupons = async () => {
    setLoading(true);
    // 📌 ดึงข้อมูลดิบๆ มาก่อน แล้วมาเรียงในแอป ชัวร์กว่า!
    const { data, error } = await supabase.from('coupons').select('*');
    
    if (error) {
      Alert.alert('ดึงข้อมูลล้มเหลว', error.message);
    } else if (data) {
      // เรียงจากคูปองใหม่ไปเก่า
      const sortedData = data.sort((a, b) => b.id - a.id);
      setCoupons(sortedData);
    }
    setLoading(false);
  };

  const handleSaveCoupon = async () => {
    if (!title || !code || !expDate || !discountAmount) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ (ชื่อ, โค้ด, มูลค่า, วันหมดอายุ)');
      return;
    }

    setLoading(true);
    const payload = {
      title: title,
      description: desc,
      code: code.toUpperCase(),
      discount_amount: parseFloat(discountAmount), 
      expire_date: expDate, 
      valid_until: new Date('2026-12-31T23:59:59Z').toISOString(),
      color: color,
      is_active: true
    };

    if (editingId) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editingId);
      if (error) Alert.alert('ข้อผิดพลาด', error.message);
      else {
        Alert.alert('สำเร็จ!', 'แก้ไขคูปองเรียบร้อยแล้ว ✏️');
        closeModal();
        fetchCoupons();
      }
    } else {
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) Alert.alert('ข้อผิดพลาด', error.message);
      else {
        Alert.alert('สำเร็จ!', 'เพิ่มคูปองใหม่เรียบร้อยแล้ว 🎉');
        closeModal();
        fetchCoupons();
      }
    }
    setLoading(false);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDesc(item.description || '');
    setCode(item.code || '');
    setDiscountAmount(item.discount_amount ? item.discount_amount.toString() : '');
    setExpDate(item.expire_date || '');
    setColor(item.color || '#5E35B1');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle(''); setDesc(''); setCode(''); setExpDate(''); setDiscountAmount(''); setColor('#5E35B1');
  };

  const handleDeleteCoupon = (id: number) => {
    Alert.alert('ยืนยันการลบ', 'ลบคูปองนี้ทิ้งใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบเลย', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('coupons').delete().eq('id', id);
          if (error) Alert.alert('ลบล้มเหลว', error.message);
          else fetchCoupons();
        } 
      }
    ]);
  };

  const renderCouponCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: item.color || '#5E35B1' }]} />
      <View style={styles.cardContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.couponTitle}>{item.title}</Text>
          <Text style={styles.couponDesc}>{item.description}</Text>
          <Text style={{color: '#E91E63', fontWeight: 'bold', marginBottom: 10, fontSize: 12}}>ลดราคา: {item.discount_amount} บาท</Text>
          <View style={styles.codeRow}>
            <View style={styles.codeBox}><Text style={[styles.codeText, {color: item.color || '#5E35B1'}]}>{item.code}</Text></View>
            <Text style={styles.expText}>หมดเขต: {item.expire_date}</Text>
          </View>
        </View>
        
        {/* 🎛️ ปุ่มจัดการ (แก้ไข & ลบ) โผล่มาแล้ว! */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCoupon(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการคูปอง (Coupons)</Text>
        <TouchableOpacity onPress={() => { closeModal(); setModalVisible(true); }} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderCouponCard}
          ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีคูปองส่วนลดในระบบ</Text>}
        />
      )}

      {/* 📝 Modal ฟอร์ม (เพิ่ม/แก้ไข) */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</Text>
                <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
              </View>

              <Text style={styles.label}>ชื่อโปรโมชั่น (Title)</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#9E9E9E" />

              <Text style={styles.label}>รายละเอียด (Description)</Text>
              <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholderTextColor="#9E9E9E" />

              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{flex: 1, marginRight: 10}}>
                  <Text style={styles.label}>โค้ดส่วนลด (Code)</Text>
                  <TextInput style={styles.input} value={code} onChangeText={setCode} placeholderTextColor="#9E9E9E" autoCapitalize="characters" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>วันหมดเขต</Text>
                  <TextInput style={styles.input} value={expDate} onChangeText={setExpDate} placeholderTextColor="#9E9E9E" />
                </View>
              </View>

              <Text style={styles.label}>มูลค่าส่วนลด (บาท)</Text>
              <TextInput style={styles.input} value={discountAmount} onChangeText={setDiscountAmount} placeholderTextColor="#9E9E9E" keyboardType="numeric" />

              <Text style={styles.label}>เลือกสีคูปอง</Text>
              <View style={styles.colorPicker}>
                {['#5E35B1', '#E91E63', '#4CAF50', '#FF9800', '#2196F3'].map((c) => (
                  <TouchableOpacity key={c} style={[styles.colorCircle, {backgroundColor: c}, color === c && styles.colorActive]} onPress={() => setColor(c)}>
                    {color === c && <Ionicons name="checkmark" size={20} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCoupon}>
                <Text style={styles.saveBtnText}>{editingId ? 'บันทึกการแก้ไข' : 'บันทึกคูปองใหม่'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1E36' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  listContent: { padding: 20, paddingBottom: 100 },
  
  card: { flexDirection: 'row', backgroundColor: '#2A2C49', borderRadius: 15, marginBottom: 15, elevation: 3, overflow: 'hidden' },
  colorBar: { width: 10, height: '100%' },
  cardContent: { flex: 1, flexDirection: 'row', padding: 15, alignItems: 'center' },
  couponTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  couponDesc: { color: '#AAA', fontSize: 12, marginBottom: 5 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  codeBox: { backgroundColor: '#1C1E36', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 10 },
  codeText: { fontWeight: 'bold', fontSize: 14 },
  expText: { color: '#757575', fontSize: 10 },
  
  actionButtons: { justifyContent: 'space-between', paddingLeft: 10, height: 80 },
  editBtn: { padding: 10, backgroundColor: 'rgba(33,150,243,0.1)', borderRadius: 10 },
  deleteBtn: { padding: 10, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 10 },
  
  emptyText: { color: '#757575', textAlign: 'center', marginTop: 50, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#2A2C49', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  label: { color: '#AAA', fontSize: 12, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#1C1E36', color: '#FFF', height: 50, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#3A3C59', marginBottom: 10 },
  
  colorPicker: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorActive: { borderWidth: 3, borderColor: '#FFF' },

  saveBtn: { backgroundColor: '#4CAF50', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../supabase';

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 States สำหรับ Modal ฟอร์ม (เพิ่ม/แก้ไข)
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // ข้อมูลในฟอร์ม
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('เปอร์เซ็นต์ (%)');
  const [discountAmount, setDiscountAmount] = useState(''); 
  const [minPrice, setMinPrice] = useState(''); 
  const [usageLimit, setUsageLimit] = useState(''); 
  const [expDate, setExpDate] = useState('');
  const [color, setColor] = useState('#5E35B1');

  const [stats, setStats] = useState({ total: 0, used: 0, savedValue: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchCoupons();
    }, [])
  );

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('coupons').select('*');
    
    if (error) {
      Alert.alert('ดึงข้อมูลล้มเหลว', error.message);
    } else if (data) {
      const sortedData = data.sort((a, b) => b.id - a.id);
      setCoupons(sortedData);
      // ตัวเลขจำลองการใช้งาน (เบสจริงอาจจะต้อง join กับ bookings)
      setStats({ total: sortedData.length, used: 2841, savedValue: 284100 }); 
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
    setMinPrice('500'); // Mock
    setUsageLimit('500'); // Mock
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle(''); setDesc(''); setCode(''); setExpDate(''); setDiscountAmount(''); 
    setMinPrice(''); setUsageLimit(''); setColor('#5E35B1');
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

  const renderCouponRow = ({ item }: { item: any }) => (
    <View style={styles.tableRow}>
      <View style={[styles.td, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={[styles.iconCircle, { backgroundColor: item.color || '#4CAF50' }]}>
          <Ionicons name="star" size={12} color="#FFF" />
        </View>
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.couponNameText} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.couponSubText} numberOfLines={1}>{item.description}</Text>
        </View>
      </View>
      
      <View style={[styles.td, { flex: 1.5, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.codeBadge, { backgroundColor: item.color || '#5E35B1' }]}>
          <Text style={styles.codeBadgeText}>{item.code}</Text>
        </View>
      </View>
      
      <View style={[styles.td, { flex: 1.5, justifyContent: 'center' }]}>
        <Text style={styles.mainValueText}>{item.discount_amount} บาท</Text>
        <Text style={styles.subValueText}>ขั้นต่ำ 500</Text>
      </View>

      <View style={[styles.td, { flex: 1.5, justifyContent: 'center' }]}>
        <Text style={styles.usageText}>145 / 500</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '30%', backgroundColor: item.color || '#4CAF50' }]} />
        </View>
      </View>

      <View style={[styles.td, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? '#4CAF50' : '#F44336' }]}>
            {item.is_active ? 'ใช้งาน' : 'หมดอายุ'}
          </Text>
        </View>
      </View>

      <View style={[styles.td, { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
          <Ionicons name="pencil" size={14} color="#757575" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteCoupon(item.id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={14} color="#757575" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* 👑 ฉากหลังสีน้ำเงิน (เอาไว้ด้านหลังสุด) */}
      <View style={styles.headerBg}>
        <View style={styles.headerCurve} />
      </View>

      {/* 👑 Header ปุ่มและข้อความ (ยกระดับ zIndex ให้ลอยอยู่บนสุดเพื่อไม่ให้ปุ่มโดนทับ) */}
      <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.headerTitle}>จัดการคูปองส่วนลด</Text>
            <Text style={styles.headerSub}>เพิ่ม แก้ไข และลบคูปองส่วนลด</Text>
          </View>
          {/* ลบตัว A ออกแล้ว */}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ปุ่มสร้างคูปองใหม่ */}
        <View style={{ alignItems: 'flex-end', marginBottom: 15 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => { closeModal(); setModalVisible(true); }}>
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>สร้างคูปองใหม่</Text>
          </TouchableOpacity>
        </View>


        {/* 📋 ตารางรายการคูปอง */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderSection}>
            <Text style={styles.tableTitle}>รายการคูปองทั้งหมด</Text>
            <View style={styles.filterBox}>
              <Text style={styles.filterText}>ทุกสถานะ</Text>
              <Ionicons name="chevron-down" size={14} color="#757575" />
            </View>
          </View>

          {/* หัวตาราง */}
          <View style={styles.thRow}>
            <Text style={[styles.thText, {flex: 2}]}>คูปอง</Text>
            <Text style={[styles.thText, {flex: 1.5, textAlign: 'center'}]}>โค้ด</Text>
            <Text style={[styles.thText, {flex: 1.5, textAlign: 'center'}]}>ส่วนลด</Text>
            <Text style={[styles.thText, {flex: 1.5, textAlign: 'center'}]}>ใช้ไปแล้ว</Text>
            <Text style={[styles.thText, {flex: 1, textAlign: 'center'}]}>สถานะ</Text>
            <Text style={[styles.thText, {flex: 1, textAlign: 'center'}]}>จัดการ</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#5E35B1" style={{marginVertical: 30}} />
          ) : (
            <View style={styles.tbody}>
              {coupons.length > 0 ? coupons.map(item => (
                <React.Fragment key={item.id}>
                  {renderCouponRow({item})}
                </React.Fragment>
              )) : <Text style={styles.emptyText}>ไม่มีข้อมูลคูปอง</Text>}
            </View>
          )}
        </View>

      </ScrollView>

      {/* 📝 Modal ฟอร์ม (เพิ่ม/แก้ไข) โทนสว่าง */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingId ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}</Text>
                <Text style={styles.modalSubTitle}>กำหนดเงื่อนไขและส่วนลด</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              
              <Text style={styles.label}>ชื่อคูปอง (Title)</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="เช่น โปรสงกรานต์ 2026" placeholderTextColor="#BDBDBD" />

              <Text style={styles.label}>คำอธิบาย (Description)</Text>
              <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} placeholder="อธิบายเงื่อนไขการใช้คูปอง..." placeholderTextColor="#BDBDBD" multiline textAlignVertical="top" />

              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>โค้ด (Code)</Text>
                  <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="SONGKRAN30" placeholderTextColor="#BDBDBD" autoCapitalize="characters" />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ประเภทส่วนลด</Text>
                  <View style={styles.dropdownFake}>
                    <Text style={{color: '#333'}}>{discountType}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ส่วนลด</Text>
                  <TextInput style={styles.input} value={discountAmount} onChangeText={setDiscountAmount} placeholder="30" placeholderTextColor="#BDBDBD" keyboardType="numeric" />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ราคาขั้นต่ำ (THB)</Text>
                  <TextInput style={styles.input} value={minPrice} onChangeText={setMinPrice} placeholder="500" placeholderTextColor="#BDBDBD" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>จำกัดการใช้ (ครั้ง)</Text>
                  <TextInput style={styles.input} value={usageLimit} onChangeText={setUsageLimit} placeholder="500 (0=ไม่จำกัด)" placeholderTextColor="#BDBDBD" keyboardType="numeric" />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>วันหมดอายุ</Text>
                  <TextInput style={styles.input} value={expDate} onChangeText={setExpDate} placeholder="mm/dd/yyyy" placeholderTextColor="#BDBDBD" />
                </View>
              </View>

              <Text style={styles.label}>สีไอคอนคูปอง</Text>
              <View style={styles.colorPicker}>
                {['#5E35B1', '#E91E63', '#4CAF50', '#FF9800', '#2196F3'].map((c) => (
                  <TouchableOpacity key={c} style={[styles.colorCircle, {backgroundColor: c}]} onPress={() => setColor(c)}>
                    {color === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* ปุ่มบันทึก / ยกเลิก */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCoupon}>
                  <Ionicons name="checkmark" size={16} color="#FFF" style={{marginRight: 5}}/>
                  <Text style={styles.saveBtnText}>{editingId ? 'บันทึกแก้ไข' : 'บันทึกคูปอง'}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  
  // Header
  headerBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden', zIndex: 0 },
  headerCurve: { position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#B0B2C3', fontSize: 12, marginTop: 2 },

  // Scroll Content ปรับดันลงมาให้พ้น Header
  scrollContent: { padding: 20, paddingTop: 80, paddingBottom: 50 },

  createBtn: { flexDirection: 'row', backgroundColor: '#5E35B1', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', elevation: 3 },
  createBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { width: '31%', backgroundColor: '#FFF', borderRadius: 15, padding: 12, alignItems: 'center', elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  statLabel: { fontSize: 9, color: '#757575', textAlign: 'center', marginTop: 2 },
  statInfo: { alignItems: 'center' },

  // Table
  tableContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, elevation: 3 },
  tableHeaderSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tableTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  filterBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  filterText: { fontSize: 10, color: '#757575', marginRight: 5 },
  
  thRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 10, marginBottom: 10 },
  thText: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },
  tbody: { paddingBottom: 10 },
  
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingVertical: 12 },
  td: { justifyContent: 'center' },
  iconCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  couponNameText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  couponSubText: { fontSize: 9, color: '#9E9E9E', marginTop: 2 },
  
  codeBadge: { alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  codeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  
  mainValueText: { fontSize: 11, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subValueText: { fontSize: 9, color: '#9E9E9E', textAlign: 'center', marginTop: 2 },
  
  usageText: { fontSize: 9, color: '#333', textAlign: 'center', marginBottom: 3 },
  progressBarBg: { height: 4, backgroundColor: '#EEEEEE', borderRadius: 2, width: '80%', alignSelf: 'center' },
  progressBarFill: { height: 4, borderRadius: 2 },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  
  actionBtn: { padding: 6, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8 },

  emptyText: { color: '#9E9E9E', textAlign: 'center', marginVertical: 20, fontSize: 12 },

  // Modal สว่าง
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  modalHeader: { marginBottom: 20 },
  modalTitle: { color: '#333', fontSize: 18, fontWeight: 'bold' },
  modalSubTitle: { color: '#9E9E9E', fontSize: 12, marginTop: 2 },
  
  label: { color: '#333', fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#FFF', color: '#333', height: 45, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 5, fontSize: 13 },
  textArea: { height: 80, paddingTop: 15 },
  dropdownFake: { backgroundColor: '#FFF', height: 45, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E0E0E0', justifyContent: 'center' },
  
  rowGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '48%' },

  colorPicker: { flexDirection: 'row', marginTop: 5, marginBottom: 25 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10 },
  cancelBtnText: { color: '#757575', fontSize: 13, fontWeight: 'bold' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#5E35B1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', elevation: 2 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

export default function CouponScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔔 State สำหรับ Custom Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false });

    if (data) setCoupons(data);
    setLoading(false);
  };

  // 🔔 ฟังก์ชันเรียก Alert สไตล์ใหม่
  const showCustomAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const handleCopyCode = (code: string) => {
    showCustomAlert(
      'คัดลอกสำเร็จ! ✂️',
      `คัดลอกโค้ด "${code}" เรียบร้อยแล้ว\nนำไปวางในช่องส่วนลดหน้าชำระเงินได้เลยครับ`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔝 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <MaterialCommunityIcons name="ticket-percent-outline" size={22} color="#333" />
          <Text style={styles.titleText}>My Coupons</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageSubtitle}>คูปองที่สามารถใช้ได้</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
        ) : coupons.length === 0 ? (
          <View style={{alignItems: 'center', marginTop: 50}}>
            <MaterialCommunityIcons name="ticket-outline" size={50} color="#E0E0E0" />
            <Text style={{color: '#9E9E9E', marginTop: 10}}>ยังไม่มีคูปองส่วนลดในขณะนี้</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={[styles.colorBar, { backgroundColor: coupon.color || '#5E35B1' }]} />
              
              <View style={styles.cardContent}>
                <View style={{ flex: 1, paddingRight: 15 }}>
                  <Text style={styles.couponTitle}>{coupon.title}</Text>
                  <Text style={styles.couponDesc}>{coupon.description}</Text>
                  <Text style={{color: '#E91E63', fontWeight: 'bold', fontSize: 12, marginBottom: 5}}>ลดราคา: {coupon.discount_amount} บาท</Text>
                  <Text style={styles.couponExp}>หมดเขต: {coupon.expire_date}</Text>
                </View>

                <View style={styles.dashedLine} />
                <View style={styles.cutoutTop} />
                <View style={styles.cutoutBottom} />

                <View style={styles.actionArea}>
                  <Text style={styles.codeLabel}>CODE</Text>
                  <Text style={[styles.codeText, { color: coupon.color || '#5E35B1' }]}>{coupon.code}</Text>
                  <TouchableOpacity 
                    style={[styles.copyBtn, { backgroundColor: coupon.color || '#5E35B1' }]}
                    onPress={() => handleCopyCode(coupon.code)}
                  >
                    <Text style={styles.copyBtnText}>คัดลอก</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.addCodeSection}>
          <Text style={styles.addCodeTitle}>มีโค้ดส่วนลดอื่นๆ หรือไม่?</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="ticket-outline" size={20} color="#9E9E9E" />
            <Text style={{ flex: 1, marginLeft: 10, color: '#9E9E9E' }}>พิมพ์โค้ดส่วนลดที่นี่...</Text>
            <TouchableOpacity 
                style={styles.applyBtn}
                onPress={() => showCustomAlert('ขออภัย', 'ขณะนี้ระบบยังไม่เปิดให้เพิ่มโค้ดด้วยตนเอง')}
            >
              <Text style={styles.applyBtnText}>เก็บโค้ด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 🔔✨ Modern Custom Alert Modal */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}>
              <MaterialCommunityIcons name="ticket-confirmation" size={32} color="#5E35B1" />
            </View>
            <Text style={styles.alertTitleText}>{alertTitle}</Text>
            <Text style={styles.alertSubText}>{alertMessage}</Text>
            <TouchableOpacity 
              style={styles.alertConfirmBtn} 
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertConfirmText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  pageSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 20, marginLeft: 5 },

  couponCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden' },
  colorBar: { width: 12, height: '100%' },
  cardContent: { flex: 1, flexDirection: 'row', padding: 20, position: 'relative' },
  couponTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  couponDesc: { fontSize: 12, color: '#757575', lineHeight: 18, marginBottom: 10 },
  couponExp: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },

  dashedLine: { width: 1, height: '110%', borderWidth: 1, borderStyle: 'dashed', borderColor: '#E0E0E0', borderRadius: 1, position: 'absolute', right: 110, top: 0 },
  cutoutTop: { position: 'absolute', right: 100, top: -15, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FAFAFA' },
  cutoutBottom: { position: 'absolute', right: 100, bottom: -15, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FAFAFA' },

  actionArea: { width: 90, justifyContent: 'center', alignItems: 'center', paddingLeft: 10 },
  codeLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: 'bold' },
  codeText: { fontSize: 16, fontWeight: '900', marginVertical: 5 },
  copyBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginTop: 5 },
  copyBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  addCodeSection: { marginTop: 30, padding: 20, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  addCodeTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 15, paddingLeft: 15, height: 50 },
  applyBtn: { backgroundColor: '#333', height: '100%', paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 15, borderBottomRightRadius: 15 },
  applyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // 🔔 Styles สำหรับ Modern Alert
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: width * 0.85,
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  alertTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertSubText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  alertConfirmBtn: {
    backgroundColor: '#5E35B1',
    paddingVertical: 14,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
  },
  alertConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

export default function SummaryScreen() {
  const params = useLocalSearchParams();
  const { 
    tripType, origin, destination, departureDate, returnDate, 
    trainType, cabinClass, cabinNumber, adults, children, 
    depTime, arrTime, duration, selectedSeats, totalPrice, trip_id 
  } = params;

  const [paymentMethod, setPaymentMethod] = useState('qr');
  const [loading, setLoading] = useState(false);

  // 🆕 State สำหรับ Modern Alert (เพิ่มเข้าไปจากเดิม)
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'success' as 'success' | 'error',
    onConfirm: () => {} 
  });

  const totalPax = Number(adults) + Number(children);
  const finalPrice = Number(totalPrice);
  const netPrice = tripType === 'round-trip' ? finalPrice * 2 : finalPrice;

  // 🆕 ฟังก์ชันช่วยแสดง Alert (เพิ่มเข้าไป)
  const showAlert = (title: string, message: string, type: 'success' | 'error', onConfirm?: () => void) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false })))
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          showAlert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบก่อนชำระเงิน', 'error');
          return;
      }

      const { data: stData, error: stError } = await supabase
        .from('stations')
        .select('id, station_name')
        .in('station_name', [String(origin), String(destination)]);

      if (stError || !stData || stData.length < 2) {
        showAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลสถานีในระบบ', 'error');
        return;
      }

      const originId = stData.find(s => s.station_name === origin)?.id;
      const destId = stData.find(s => s.station_name === destination)?.id;

      const { error } = await supabase.from('bookings').insert([
          {
              user_id: user.id,
              origin_station_id: originId,
              destination_station_id: destId,
              total_price: netPrice,
              status: 'Confirmed',
              trip_id: trip_id, 
              selected_seats: String(selectedSeats) 
          }
      ]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
          user_id: user.id,
          title: 'จองตั๋วสำเร็จ! 🎉',
          message: `การจองตั๋วของคุณจาก ${origin} ไปยัง ${destination} สำหรับ ${totalPax} ท่าน ได้รับการยืนยันแล้ว`,
          type: 'ticket'
      }]);

      // ✅ แสดงความสำเร็จและเปลี่ยนหน้า
      showAlert(
        'ชำระเงินสำเร็จ!', 
        'บันทึกตั๋วของคุณเรียบร้อยแล้ว เตรียมตัวเดินทางได้เลย 🚂', 
        'success',
        () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          router.push({ pathname: '/my-ticket', params: { ...params } });
        }
      );

    } catch (error: any) {
      showAlert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatSeatsWithType = (seatsStr: string) => {
    if (!seatsStr) return '';
    const seatsArray = seatsStr.split(',').map(s => s.trim());
    const formatted = seatsArray.map(s => {
      const parts = s.split('-'); 
      if (parts.length === 2) {
        const seatNum = parseInt(parts[1]);
        const seatType = seatNum % 2 !== 0 ? 'ชั้นล่าง' : 'ชั้นบน';
        return `${seatNum} (${seatType})`;
      }
      return s;
    });
    return `${totalPax} คน - ที่นั่งหมายเลข ${formatted.join(', ')}`;
  };

  const renderTicketCard = (type: 'go' | 'return', price: number) => {
    const isGo = type === 'go';
    const cardOrigin = isGo ? origin : destination;
    const cardDest = isGo ? destination : origin;
    const cardDepTime = isGo ? depTime : arrTime; 
    const cardArrTime = isGo ? arrTime : depTime;

    return (
      <View style={styles.ticketCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: isGo ? '#E8F5E9' : '#FCE4EC' }]}>
                <Text style={[styles.badgeText, { color: isGo ? '#4CAF50' : '#E91E63' }]}>{isGo ? 'ขาไป' : 'ขากลับ'}</Text>
            </View>
          </View>
          <View style={styles.routeHeaderRow}>
            <Text style={styles.cityTextMain}>{cardOrigin}</Text>
            <View style={styles.arrowContainer}>
                <Text style={styles.durationSmallText}>{duration}</Text>
                <Ionicons name="arrow-forward" size={20} color="#BDBDBD" />
            </View>
            <Text style={styles.cityTextMain}>{cardDest}</Text>
          </View>
          <View style={styles.routeTimeRow}>
            <Text style={styles.timeTextMain}>{cardDepTime}</Text>
            <Text style={styles.timeTextMain}>{cardArrTime}</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelLeft}>{trainType}</Text>
              <Text style={styles.infoLabelRight}>{cabinClass}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabelLeft}>ตู้ที่ {cabinNumber}</Text>
              <Text style={styles.infoLabelRight} numberOfLines={1}>{formatSeatsWithType(String(selectedSeats))}</Text>
            </View>
          </View>
          <View style={styles.divider} /> 
          <View style={styles.priceRow}>
            <Text style={styles.totalText}>ยอดรวม</Text>
            <Text style={styles.priceTextMain}>THB {price.toLocaleString('en-US')}</Text>
          </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.blueHeaderBg}><View style={styles.headerGraphicCircle} /></View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ชำระเงิน</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderTicketCard('go', finalPrice)}
          {tripType === 'round-trip' && renderTicketCard('return', finalPrice)}

          <Text style={styles.paymentSectionTitle}>ช่องทางการชำระเงิน</Text>
          
          <View style={styles.paymentCard}>
            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('credit')}>
              <View style={[styles.payIconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="card" size={20} color="#5E35B1" /></View>
              <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>บัตรเครดิต / เดบิต</Text>
                <Text style={styles.paySubText}>Visa, Mastercard, JCB</Text>
              </View>
              <Ionicons name={paymentMethod === 'credit' ? "checkmark-circle" : "ellipse-outline"} size={24} color={paymentMethod === 'credit' ? "#5E35B1" : "#E0E0E0"} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('promptpay')}>
              <View style={[styles.payIconBox, {backgroundColor: '#D4F1E5'}]}><Ionicons name="card-outline" size={20} color="#4CAF50" /></View>
              <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>PromptPay</Text>
                <Text style={styles.paySubText}>ชำระด้วยพร้อมเพย์</Text>
              </View>
              <Ionicons name={paymentMethod === 'promptpay' ? "checkmark-circle" : "ellipse-outline"} size={24} color={paymentMethod === 'promptpay' ? "#5E35B1" : "#E0E0E0"} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('truemoney')}>
              <View style={[styles.payIconBox, {backgroundColor: '#FFF59D'}]}><Ionicons name="wallet" size={20} color="#FBC02D" /></View>
              <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>True Money Wallet</Text>
                <Text style={styles.paySubText}>ทรูมันนี่วอลเล็ท</Text>
              </View>
              <Ionicons name={paymentMethod === 'truemoney' ? "checkmark-circle" : "ellipse-outline"} size={24} color={paymentMethod === 'truemoney' ? "#5E35B1" : "#E0E0E0"} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.paymentOption, {borderBottomWidth: 0}]} onPress={() => setPaymentMethod('qr')}>
              <View style={[styles.payIconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="qr-code" size={20} color="#5E35B1" /></View>
              <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>QR Code</Text>
                <Text style={styles.paySubText}>สแกนจ่ายผ่านธนาคาร</Text>
              </View>
              <Ionicons name={paymentMethod === 'qr' ? "checkmark-circle" : "ellipse-outline"} size={24} color={paymentMethod === 'qr' ? "#5E35B1" : "#E0E0E0"} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <View style={styles.bottomFooter}>
        <View style={styles.footerPriceRow}>
          <Text style={styles.footerLabel}>ยอดที่ต้องชำระ:</Text>
          <Text style={styles.footerPriceValue}>THB {netPrice.toLocaleString('en-US')}</Text>
        </View>
        <TouchableOpacity style={[styles.confirmBtn, loading && {opacity: 0.7}]} onPress={handlePayment} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{marginRight: 10}} />
              <Text style={styles.confirmBtnText}>ยืนยันการชำระเงิน</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 🔔 Modern Alert Modal */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconBg, { backgroundColor: alertConfig.type === 'success' ? '#E8F5E9' : '#FFEBEE' }]}>
              <Ionicons name={alertConfig.type === 'success' ? "checkmark-circle" : "alert-circle"} size={40} color={alertConfig.type === 'success' ? "#4CAF50" : "#F44336"} />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity style={[styles.alertConfirmBtn, { backgroundColor: alertConfig.type === 'success' ? '#262956' : '#F44336' }]} onPress={alertConfig.onConfirm}>
              <Text style={styles.alertConfirmBtnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  safeArea: { flex: 1 },
  blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 250, backgroundColor: '#2E3165', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', zIndex: 0 },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, zIndex: 10 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 150, zIndex: 5 },
  ticketCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  badgeRow: { marginBottom: 15, alignItems: 'flex-start' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  routeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityTextMain: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  arrowContainer: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  durationSmallText: { fontSize: 9, color: '#9E9E9E', marginBottom: -2 },
  routeTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, marginBottom: 20 },
  timeTextMain: { fontSize: 12, color: '#757575' },
  infoGrid: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  infoLabelLeft: { fontSize: 11, color: '#757575', width: 80 },
  infoLabelRight: { fontSize: 11, color: '#757575', flex: 1, textAlign: 'left' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  priceTextMain: { fontSize: 16, fontWeight: 'bold', color: '#5E35B1' },
  paymentSectionTitle: { fontSize: 14, color: '#757575', marginBottom: 10, marginLeft: 5 },
  paymentCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, marginBottom: 20, borderWidth: 1, borderColor: '#EEEEEE' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', marginBottom: 5 },
  payIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payMainText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  paySubText: { fontSize: 10, color: '#9E9E9E', marginTop: 2 },
  bottomFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#EBE4FF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 35, elevation: 20 },
  footerPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 10 },
  footerLabel: { color: '#5E35B1', fontSize: 14, fontWeight: 'bold' },
  footerPriceValue: { color: '#5E35B1', fontSize: 18, fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#3F51B5', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Styles สำหรับ Alert
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertBox: { width: '100%', backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10 },
  alertIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: -60, borderWidth: 5, borderColor: '#FFF' },
  alertTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  alertMessage: { fontSize: 16, color: '#757575', textAlign: 'center', marginBottom: 25 },
  alertConfirmBtn: { paddingVertical: 15, paddingHorizontal: 50, borderRadius: 20, width: '100%', alignItems: 'center' },
  alertConfirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
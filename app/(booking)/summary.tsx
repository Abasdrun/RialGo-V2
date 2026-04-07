import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

export default function SummaryScreen() {
  const params = useLocalSearchParams();
  const { 
    tripType, origin, destination, departureDate, returnDate, 
    trainType, cabinClass, cabinNumber, adults, children, 
    depTime, arrTime, duration, selectedSeats, totalPrice 
  } = params;

  const [paymentMethod, setPaymentMethod] = useState('qr');
  const [loading, setLoading] = useState(false);

  const totalPax = Number(adults) + Number(children);
  const finalPrice = Number(totalPrice);
  const netPrice = tripType === 'round-trip' ? finalPrice * 2 : finalPrice;

  // 🚀 Logic กดชำระเงิน ยิงเข้าโครงสร้าง DB เดิมของพี่ยอนเป๊ะๆ
  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          Alert.alert('ข้อผิดพลาด', 'กรุณาเข้าสู่ระบบก่อนชำระเงิน');
          return;
      }

      // 1. หา ID ของสถานีต้นทางและปลายทาง (เพราะตาราง bookings ใช้ _id)
      const { data: stData, error: stError } = await supabase
        .from('stations')
        .select('id, station_name')
        .in('station_name', [origin, destination]);

      if (stError || !stData || stData.length < 2) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลสถานีในระบบ');
        return;
      }

      const originId = stData.find(s => s.station_name === origin)?.id;
      const destId = stData.find(s => s.station_name === destination)?.id;

      // 2. ยิงเข้าตาราง bookings ของพี่ยอน (ไม่มั่วคอลัมน์แล้ว!)
      const { error } = await supabase.from('bookings').insert([
          {
              user_id: user.id,
              origin_station_id: originId,
              destination_station_id: destId,
              total_price: netPrice,
              status: 'Confirmed'
              // trip_id กับ coupon_id ปล่อยว่าง (null) ไปก่อนเพราะเราใช้ข้อมูลจำลอง
          }
      ]);

      if (error) throw error;

      // 📌 แทรกโค้ดยิงแจ้งเตือนตรงนี้ (หลัง insert bookings สำเร็จ)
      await supabase.from('notifications').insert([{
          user_id: user.id,
          title: 'จองตั๋วสำเร็จ! 🎉',
          message: `การจองตั๋วของคุณจาก ${origin} ไปยัง ${destination} สำหรับ ${totalPax} ท่าน ได้รับการยืนยันแล้ว`,
          type: 'ticket'
      }]);
      // 📌 จบการแทรกโค้ดแจ้งเตือน

      // 3. จ่ายสำเร็จ! ส่งข้อมูลทั้งหมดไปหน้า My Ticket (Phase 5) เพื่อโชว์ตั๋ว
      Alert.alert(
          'ชำระเงินสำเร็จ!', 
          'บันทึกตั๋วของคุณเรียบร้อยแล้ว เตรียมตัวเดินทางได้เลย 🚂',
          [{ 
            text: 'ดูตั๋วของฉัน', 
            onPress: () => router.push({
              pathname: '/my-ticket', // ✅ แก้ตรงนี้ให้ชี้ไปที่ /my-ticket แล้ว!
              params: { ...params } // ส่ง params ไปโชว์หน้าตั๋วต่อ
            }) 
          }]
      );

    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // 🎟️ สลิปตั๋ว
  const renderTicketCard = (type: 'go' | 'return', dateStr: string, price: number) => (
    <View style={styles.ticketCard}>
        <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: type === 'go' ? '#4CAF50' : '#F44336' }]}>
                <Text style={styles.badgeText}>{type === 'go' ? 'ขาไป' : 'ขากลับ'}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="calendar-outline" size={14} color="#333" />
                <Text style={styles.dateText}> {dateStr} | {duration}</Text>
            </View>
        </View>

        <View style={styles.journeyContent}>
            <View style={styles.timelineCol}>
                <Text style={styles.timeText}>{depTime}</Text>
                <Ionicons name="train" size={20} color="#333" style={{marginVertical: 5}} />
                <Text style={styles.timeText}>{arrTime}</Text>
            </View>
            <View style={styles.timelineLine}>
                <View style={styles.dotFilled} />
                <View style={styles.verticalLine} />
                <View style={styles.dotOutline} />
            </View>
            <View style={styles.stationCol}>
                <Text style={styles.stationText}>{type === 'go' ? origin : destination}</Text>
                <Text style={[styles.stationText, {marginTop: 'auto'}]}>{type === 'go' ? destination : origin}</Text>
            </View>
        </View>

        <View style={styles.ticketDetails}>
            <Text style={styles.detailLabel}>ราคารวมสำหรับ {totalPax} คน</Text>
            <Text style={styles.detailLabel}>ชั้นโดยสาร {trainType}</Text>
            <Text style={styles.detailLabel}>ตู้ {cabinNumber}</Text>
            <Text style={styles.detailLabel}>ที่นั่ง {selectedSeats}</Text>
            <Text style={styles.priceText}>THB {price.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Ionicons name="sync" size={20} color="#333" />
          <Text style={styles.headerTitle}>ชำระเงิน</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🎟️ สลิปขาไป */}
        {renderTicketCard('go', String(departureDate), finalPrice)}

        {/* 🎟️ สลิปขากลับ */}
        {tripType === 'round-trip' && renderTicketCard('return', String(returnDate), finalPrice)}

        {/* 💰 ยอดสุทธิ */}
        <View style={styles.netPriceBox}>
            <Text style={styles.netLabel}>ยอดสุทธิ</Text>
            <Text style={styles.netPriceText}>THB {netPrice.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
        </View>

        {/* 💳 ช่องทางการชำระเงิน */}
        <Text style={styles.paymentSectionTitle}>ช่องทางการชำระเงิน</Text>
        
        <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('bank')}>
            <View style={styles.payIconBox}><MaterialCommunityIcons name="bank-outline" size={24} color="#333" /></View>
            <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>ตัดบัญชีธนาคาร</Text>
                <Text style={styles.paySubText}>ธนาคารกสิกรไทย</Text>
            </View>
            <Ionicons name={paymentMethod === 'bank' ? "checkmark-circle" : "ellipse-outline"} size={28} color={paymentMethod === 'bank' ? "#333" : "#E0E0E0"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('credit')}>
            <View style={styles.payIconBox}><Ionicons name="card-outline" size={24} color="#333" /></View>
            <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>บัตรเครดิต/บัตรเดบิต</Text>
            </View>
            <Ionicons name={paymentMethod === 'credit' ? "checkmark-circle" : "ellipse-outline"} size={28} color={paymentMethod === 'credit' ? "#333" : "#E0E0E0"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('qr')}>
            <View style={styles.payIconBox}><Ionicons name="qr-code-outline" size={24} color="#333" /></View>
            <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.payMainText}>QR Code</Text>
            </View>
            <Ionicons name={paymentMethod === 'qr' ? "checkmark-circle" : "ellipse-outline"} size={28} color={paymentMethod === 'qr' ? "#333" : "#E0E0E0"} />
        </TouchableOpacity>

        {/* ✅ ปุ่มยืนยันชำระเงิน */}
        <TouchableOpacity 
            style={[styles.confirmBtn, loading && {backgroundColor: '#A5D6A7'}]} 
            onPress={handlePayment}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>ยืนยันการชำระเงิน</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  headerTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  headerTitle: { marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  ticketCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  journeyContent: { flexDirection: 'row', height: 80, marginBottom: 20 },
  timelineCol: { justifyContent: 'space-between', alignItems: 'center', width: 50 },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  timelineLine: { width: 20, alignItems: 'center', paddingVertical: 5 },
  dotFilled: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  verticalLine: { flex: 1, width: 2, backgroundColor: '#333', marginVertical: 2 },
  dotOutline: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#333', backgroundColor: '#FFF' },
  stationCol: { flex: 1, justifyContent: 'flex-start', marginLeft: 10 },
  stationText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  ticketDetails: { alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 15 },
  detailLabel: { fontSize: 10, color: '#757575', marginBottom: 2 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#E91E63', marginTop: 5 },
  netPriceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 30 },
  netLabel: { fontSize: 16, color: '#757575' },
  netPriceText: { fontSize: 18, fontWeight: 'bold', color: '#E91E63' },
  paymentSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  payIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  payMainText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  paySubText: { fontSize: 10, color: '#757575', marginTop: 2 },
  confirmBtn: { backgroundColor: '#4CAF50', height: 55, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 3 },
  confirmBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
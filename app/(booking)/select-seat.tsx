import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

export default function SelectSeatScreen() {
  const params = useLocalSearchParams();
  const { origin, destination, departureDate, trainType, cabinClass, cabinNumber: initialCabin, adults, children, infants, depTime, arrTime, duration, trip_id } = params;

  const totalPax = Number(adults) + Number(children); 
  
  // 🚀 [อัปเกรด] เปลี่ยนมาเก็บข้อมูลแบบ "ตู้-ที่นั่ง" (เช่น '1-12')
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]); // เก็บที่นั่งที่โดนซื้อไปแล้วจาก DB
  
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentCabinNum, setCurrentCabinNum] = useState(String(initialCabin));

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    
    // 1. ดึงระยะทางเพื่อใช้คำนวณราคา
    const { data: stData } = await supabase.from('stations').select('km').in('station_name', [String(origin), String(destination)]);
    if (stData && stData.length === 2) {
      setDistance(Math.abs(stData[0].km - stData[1].km));
    }

    // 2. 🚀 [ระบบใหม่] ดึงที่นั่งที่ถูกจองแล้วจากตาราง bookings ของรอบรถนี้ (trip_id)
    if (trip_id) {
      const { data: bookingsData } = await supabase.from('bookings').select('selected_seats').eq('trip_id', trip_id);
      
      if (bookingsData) {
        let allBooked: string[] = [];
        bookingsData.forEach(booking => {
          if (booking.selected_seats) {
            // แยก string "1-12, 1-13" ออกมาเป็น Array
            const seats = booking.selected_seats.split(',').map((s: string) => s.trim());
            seats.forEach((s: string) => {
              // ดักเคสข้อมูลเก่าที่อาจมีแค่ตัวเลข ให้ถือว่าเป็นตู้ 1
              if (s.includes('-')) allBooked.push(s);
              else allBooked.push(`1-${s}`); 
            });
          }
        });
        setBookedSeats(allBooked);
      }
    }
    
    setLoading(false);
  };

  // 🚀 [อัปเกรด] ระบบคำนวณราคาเตียงบน-ล่างแบบเป๊ะๆ
  const calculateSeatPrice = (seatId: string) => {
    const [cabin, seatNumStr] = seatId.split('-');
    const seatNum = Number(seatNumStr);
    
    let baseRate = 0;
    let serviceFee = trainType === 'รถด่วนพิเศษ' ? 190 : 50;
    let acFee = String(cabinClass).includes('ปรับอากาศ') ? 150 : 0;
    let berthFee = 0;

    if (String(cabinClass).includes('ชั้น 1')) baseRate = 1.2;
    else if (String(cabinClass).includes('ชั้น 2')) baseRate = 0.8;
    else baseRate = 0.4;

    const baseFare = distance * baseRate;

    // ระบบเตียงนอน: เลขคี่ = เตียงล่าง (แพงกว่า), เลขคู่ = เตียงบน (ถูกกว่า)
    if (String(cabinClass).includes('ตู้นอน')) {
        berthFee = (seatNum % 2 !== 0) ? 500 : 300; 
    }

    return baseFare + serviceFee + acFee + berthFee;
  };

  const getTotalPrice = () => {
    if (selectedSeats.length === 0) return 0;
    let total = 0;
    selectedSeats.forEach((seatId, index) => {
        const seatPrice = calculateSeatPrice(seatId);
        // ให้ส่วนลดเด็ก (สมมติว่าคนที่เลือกทีหลังผู้ใหญ่คือเด็ก)
        if (index >= Number(adults)) {
            total += (seatPrice * 0.7); 
        } else {
            total += seatPrice;
        }
    });
    return total;
  };

  const handleSelectSeat = (num: number) => {
    const seatId = `${currentCabinNum}-${num}`;

    // 🛡️ ดักไว้ไม่ให้กดที่นั่งที่ไม่ว่าง (เช็คจาก DB)
    if (bookedSeats.includes(seatId)) return; 

    if (selectedSeats.includes(seatId)) {
      // กรณีกดซ้ำเพื่อยกเลิก
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      // กรณีจองเพิ่ม (ห้ามเกินโควต้าจำนวนคน)
      if (selectedSeats.length < totalPax) {
        setSelectedSeats([...selectedSeats, seatId]);
      } else {
        alert(`คุณเลือกที่นั่งครบตามจำนวนผู้โดยสาร (${totalPax} ท่าน) แล้วครับ`);
      }
    }
  };

  const getNumberOptions = () => {
    if (trainType === 'รถด่วนพิเศษ') {
      if (String(cabinClass) === 'ตู้นอนปรับอากาศ ชั้น 2') return [1, 2, 3, 4, 5, 7, 8, 9, 10];
      if (String(cabinClass).includes('วีลแชร์')) return [6];
      return [11];
    } else {
      if (String(cabinClass) === 'ตู้นั่งพัดลม ชั้น 3') return [5, 6, 7, 8, 9, 10, 11];
      if (String(cabinClass).includes('นั่งปรับอากาศ')) return [3, 4];
      return [1, 2];
    }
  };

  const renderSeat = (num: number) => {
    const seatId = `${currentCabinNum}-${num}`;
    const isSelected = selectedSeats.includes(seatId);
    const isBooked = bookedSeats.includes(seatId);

    let bgColor = '#FFF';
    let textColor = '#333';
    
    if (isBooked) { bgColor = '#757575'; textColor = '#FFF'; } 
    else if (isSelected) { bgColor = '#4CAF50'; textColor = '#FFF'; } 

    return (
      <TouchableOpacity 
        style={[styles.seatBox, { backgroundColor: bgColor }]} 
        onPress={() => handleSelectSeat(num)}
        activeOpacity={isBooked ? 1 : 0.7}
      >
        <Text style={[styles.seatText, {color: textColor}]}>{num}</Text>
      </TouchableOpacity>
    );
  };

  const isSleeper = String(cabinClass).includes('ตู้นอน');
  
  // คำนวณที่นั่งว่างเฉพาะ "ตู้ปัจจุบัน"
  const totalSeatsInCabin = 48;
  const bookedInThisCabin = bookedSeats.filter(s => s.startsWith(`${currentCabinNum}-`)).length;
  const selectedInThisCabin = selectedSeats.filter(s => s.startsWith(`${currentCabinNum}-`)).length;
  const availableSeatsCount = totalSeatsInCabin - bookedInThisCabin - selectedInThisCabin;

  if (loading) return <View style={styles.loadingArea}><ActivityIndicator size="large" color="#5E35B1" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ขบวน{trainType}</Text>
          <View style={{width: 40}} />
        </View>

        <View style={styles.infoBoxesRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>ขบวน</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{trainType === 'รถด่วนพิเศษ' ? 'รถด่วนพิเศษ' : 'รถเร็ว/รถด่วน'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>ตู้</Text>
            <Text style={styles.infoValue}>ตู้ {currentCabinNum}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>ที่นั่งว่าง (ตู้นี้)</Text>
            <Text style={styles.infoValueGreen}>{availableSeatsCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.cabinTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {getNumberOptions().map(num => (
              <TouchableOpacity 
                key={num} 
                style={[styles.cabinTabBtn, currentCabinNum === String(num) && styles.cabinTabBtnActive]}
                onPress={() => setCurrentCabinNum(String(num))}
              >
                <Text style={[styles.cabinTabText, currentCabinNum === String(num) && styles.cabinTabTextActive]}>ตู้ {num}</Text>
              </TouchableOpacity>
            ))}
            <Ionicons name="chevron-forward" size={20} color="#757575" style={{alignSelf: 'center', marginLeft: 5}} />
          </ScrollView>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD'}]} /><Text style={styles.legendText}>ว่าง</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#4CAF50'}]} /><Text style={styles.legendText}>เลือกแล้ว</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#757575'}]} /><Text style={styles.legendText}>ไม่ว่าง</Text></View>
        </View>

        <View style={styles.seatGridContainer}>
          <Text style={styles.cabinTitleText}>{cabinClass}</Text>

          <View style={styles.gridHeader}>
              <View style={styles.facilityBox}><Text style={styles.facilityText}>ห้องน้ำ</Text></View>
          </View>

          <View style={styles.mainGridRow}>
            {/* ⬅️ ฝั่งซ้าย */}
            <View style={styles.seatCol}>
              {/* 🚀 แก้หัวแถวให้ตรงตามลอจิก (คี่=ล่าง, คู่=บน) */}
              {isSleeper && (
                <View style={styles.seatPairRowHeader}>
                  <Text style={styles.colHeaderText}>ชั้นล่าง</Text>
                  <Text style={styles.colHeaderText}>ชั้นบน</Text>
                </View>
              )}
              {[1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45].map(n => (
                <View key={n} style={styles.seatPairRow}>
                  {renderSeat(n)}
                  {renderSeat(n+1)}
                </View>
              ))}
            </View>

            {/* 🚶‍♂️ ทางเดินตรงกลาง */}
            <View style={styles.aisle}>
              <Text style={styles.aisleText}>ทางเดิน</Text>
            </View>

            {/* ➡️ ฝั่งขวา */}
            <View style={styles.seatCol}>
              {/* 🚀 แก้หัวแถวฝั่งขวาให้เหมือนฝั่งซ้าย (คี่=ล่าง, คู่=บน) */}
              {isSleeper && (
                <View style={styles.seatPairRowHeader}>
                  <Text style={styles.colHeaderText}>ชั้นล่าง</Text>
                  <Text style={styles.colHeaderText}>ชั้นบน</Text>
                </View>
              )}
              {[3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47].map(n => (
                <View key={n} style={styles.seatPairRow}>
                  {renderSeat(n)}
                  {renderSeat(n+1)}
                </View>
              ))}
            </View>
          </View>

          {isSleeper && (
            <View style={[styles.gridHeader, {alignItems: 'flex-end', marginTop: 10}]}>
              <View style={styles.facilityBox}><Text style={styles.facilityText}>ห้องน้ำ</Text></View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* 💳 Footer สีขาวลอยด้านล่าง */}
      <View style={styles.bottomFooter}>
        <View style={styles.footerRow}>
           <View style={{flex: 1, paddingRight: 10}}>
              <Text style={styles.footerLabel}>ที่นั่งที่เลือก</Text>
              {/* แปลงข้อมูลโชว์ให้สวยๆ เช่น 1-12 กลายเป็น ตู้ 1: 12 */}
              <Text style={styles.footerValue} numberOfLines={1}>
                {selectedSeats.length > 0 
                  ? selectedSeats.map(s => s.replace('-', ': ')).join(', ') 
                  : '-'}
              </Text>
           </View>
           <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.footerLabel}>ราคารวม</Text>
              <Text style={styles.footerPrice}>THB {getTotalPrice().toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
           </View>
        </View>
        
        <TouchableOpacity 
            style={[styles.confirmBtn, selectedSeats.length !== totalPax && {backgroundColor: '#9E9E9E'}]}
            disabled={selectedSeats.length !== totalPax}
            onPress={() => router.push({
              pathname: '/(booking)/summary',
              params: {
                ...params,
                cabinNumber: currentCabinNum, 
                // 🚀 ส่งข้อมูลรูปแบบ "ตู้-เลขที่นั่ง" ไปให้หน้า Summary บันทึกลง DB
                selectedSeats: selectedSeats.join(', '),
                totalPrice: getTotalPrice()
              }
            })}
        >
            <Ionicons name="checkmark" size={20} color="#FFF" style={{marginRight: 10}} />
            <Text style={styles.confirmBtnText}>ยืนยันที่นั่ง {selectedSeats.length} นั่ง</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
  
  blueHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 30, paddingTop: 50, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  infoBoxesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: '#3A3C59', marginHorizontal: 4, alignItems: 'center' },
  infoLabel: { color: '#A8AACC', fontSize: 11, marginBottom: 5 },
  infoValue: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  infoValueGreen: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },

  scrollContent: { paddingBottom: 150 },

  cabinTabsWrapper: { paddingHorizontal: 20, marginTop: 20, marginBottom: 15 },
  cabinTabBtn: { backgroundColor: '#6C6C80', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  cabinTabBtnActive: { backgroundColor: '#5E35B1' },
  cabinTabText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  cabinTabTextActive: { color: '#FFF' },

  legendRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 }, 
  legendBox: { width: 14, height: 14, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 10, color: '#757575', fontWeight: 'bold' },

  seatGridContainer: { backgroundColor: '#262956', marginHorizontal: 20, borderRadius: 30, padding: 20, paddingBottom: 40 },
  cabinTitleText: { color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  
  gridHeader: { alignItems: 'flex-start', marginBottom: 15, paddingHorizontal: 5 },
  facilityBox: { backgroundColor: '#FFF', paddingVertical: 5, paddingHorizontal: 15, borderRadius: 15 },
  facilityText: { color: '#333', fontSize: 10, fontWeight: 'bold' },

  mainGridRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 5 },
  seatCol: { flex: 1, alignItems: 'center' }, 
  seatPairRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }, 
  
  seatPairRowHeader: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  colHeaderText: { width: 36, marginHorizontal: 5, textAlign: 'center', color: '#A8AACC', fontSize: 10 },
  
  aisle: { width: 70, justifyContent: 'center', alignItems: 'center' }, 
  aisleText: { color: '#A8AACC', fontSize: 24, transform: [{ rotate: '-90deg' }], fontWeight: 'bold', width: 100, textAlign: 'center' },

  seatBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  seatText: { fontSize: 12, fontWeight: 'bold' },

  bottomFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  footerLabel: { color: '#757575', fontSize: 12, marginBottom: 5 },
  footerValue: { color: '#333', fontSize: 18, fontWeight: 'bold' },
  footerPrice: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  
  confirmBtn: { backgroundColor: '#5E35B1', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

export default function SelectSeatScreen() {
  const params = useLocalSearchParams();
  const { origin, destination, departureDate, trainType, cabinClass, cabinNumber: initialCabin, adults, children, infants, depTime, arrTime, duration } = params;

  const totalPax = Number(adults) + Number(children); 
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [currentCabinNum, setCurrentCabinNum] = useState(String(initialCabin));

  // 🎨 เอาที่นั่งผู้สูงอายุสีม่วงออกตามสั่ง เหลือแค่ที่นั่งไม่ว่าง (สีเทา)
  const mockedBookedSeats = [21, 22, 43, 44]; 
  const totalSeatsInCabin = 48;
  const availableSeatsCount = totalSeatsInCabin - mockedBookedSeats.length - selectedSeats.length;

  useEffect(() => {
    getDistance();
  }, []);

  const getDistance = async () => {
    const { data } = await supabase.from('stations').select('km').in('station_name', [origin, destination]);
    if (data && data.length === 2) {
      setDistance(Math.abs(data[0].km - data[1].km));
    }
    setLoading(false);
  };

  const calculateSeatPrice = (seatNum: number) => {
    let baseRate = 0;
    let serviceFee = trainType === 'รถด่วนพิเศษ' ? 190 : 50;
    let acFee = String(cabinClass).includes('ปรับอากาศ') ? 150 : 0;
    let berthFee = 0;

    if (String(cabinClass).includes('ชั้น 1')) baseRate = 1.2;
    else if (String(cabinClass).includes('ชั้น 2')) baseRate = 0.8;
    else baseRate = 0.4;

    const baseFare = distance * baseRate;

    if (String(cabinClass).includes('ตู้นอน')) {
        berthFee = (seatNum % 2 === 0) ? 500 : 300; 
    }

    return baseFare + serviceFee + acFee + berthFee;
  };

  const getTotalPrice = () => {
    if (selectedSeats.length === 0) return 0;
    let total = 0;
    selectedSeats.forEach((seat, index) => {
        const seatPrice = calculateSeatPrice(seat);
        if (index >= Number(adults)) {
            total += (seatPrice * 0.7); 
        } else {
            total += seatPrice;
        }
    });
    return total;
  };

  const handleSelectSeat = (num: number) => {
    // 🛡️ ดักไว้ไม่ให้กดที่นั่งที่ไม่ว่าง (สีเทา)
    if (mockedBookedSeats.includes(num)) return; 

    if (selectedSeats.includes(num)) {
      setSelectedSeats(selectedSeats.filter(s => s !== num));
    } else {
      if (selectedSeats.length < totalPax) {
        setSelectedSeats([...selectedSeats, num]);
      } else {
        alert(`คุณเลือกที่นั่งครบตามจำนวนผู้โดยสาร (${totalPax} ท่าน) แล้ว`);
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
    const isSelected = selectedSeats.includes(num);
    const isBooked = mockedBookedSeats.includes(num);

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

  if (loading) return <View style={styles.loadingArea}><ActivityIndicator size="large" color="#5E35B1" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 🌊 Header สีน้ำเงินเข้มขอบโค้งมน */}
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ขบวน{trainType}</Text>
          <View style={{width: 40}} />
        </View>

        {/* 📊 Info Boxes 3 กล่อง */}
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
            <Text style={styles.infoLabel}>ที่นั่งว่าง</Text>
            <Text style={styles.infoValueGreen}>{availableSeatsCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🗂️ แถบเลือกตู้ขบวนแนวนอน */}
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

        {/* 🏷️ Legend อธิบายสีที่นั่ง (เอาสีม่วงออก) */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD'}]} /><Text style={styles.legendText}>ว่าง</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#4CAF50'}]} /><Text style={styles.legendText}>เลือกแล้ว</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#757575'}]} /><Text style={styles.legendText}>ไม่ว่าง</Text></View>
        </View>

        {/* 💺 ผังที่นั่งการ์ดสีน้ำเงินเข้ม */}
        <View style={styles.seatGridContainer}>
          <Text style={styles.cabinTitleText}>{cabinClass}</Text>

          <View style={styles.gridHeader}>
              <View style={styles.facilityBox}><Text style={styles.facilityText}>ห้องน้ำ</Text></View>
          </View>

          <View style={styles.mainGridRow}>
            {/* ⬅️ ฝั่งซ้าย */}
            <View style={styles.seatCol}>
              {/* 🚀 ย้าย "ชั้นล่าง ชั้นบน" มาตรงกับหัวที่นั่งเป๊ะๆ */}
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

            {/* 🚶‍♂️ ทางเดินตรงกลาง (เอาลูกศรออกแล้ว) */}
            <View style={styles.aisle}>
              <Text style={styles.aisleText}>ทางเดิน</Text>
            </View>

            {/* ➡️ ฝั่งขวา */}
            <View style={styles.seatCol}>
              {/* 🚀 ย้าย "ชั้นบน ชั้นล่าง" มาตรงกับหัวที่นั่งเป๊ะๆ */}
              {isSleeper && (
                <View style={styles.seatPairRowHeader}>
                  <Text style={styles.colHeaderText}>ชั้นบน</Text>
                  <Text style={styles.colHeaderText}>ชั้นล่าง</Text>
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

          {/* ห้องน้ำด้านล่างขวา */}
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
           <View>
              <Text style={styles.footerLabel}>ที่นั่งที่เลือก</Text>
              <Text style={styles.footerValue}>{selectedSeats.sort((a,b)=>a-b).join(', ') || '-'}</Text>
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
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 }, // ขยับให้ห่างกันนิดนึงหลังจากลบสีม่วงออก
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
  
  // 🚀 สไตล์ที่เพิ่มมาใหม่เพื่อให้ป้าย "ชั้นบน / ชั้นล่าง" ตรงกับที่นั่งเป๊ะๆ
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
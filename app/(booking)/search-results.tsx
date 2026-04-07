import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

export default function SearchResultsScreen() {
  // 📥 รับค่าจากการค้นหาหน้าแรก
  const params = useLocalSearchParams();
  const { origin, destination, departureDate, trainType, cabinClass, cabinNumber } = params;

  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(0);
  const [realSchedules, setRealSchedules] = useState<any[]>([]); 

  useEffect(() => {
    fetchSchedules();
  }, []);

  // 🛡️ โลจิกดึงข้อมูลและคำนวณระยะทางเดิม 100% ไม่แตะต้อง
  const fetchSchedules = async () => {
    setLoading(true);
    const { data: stData } = await supabase
      .from('stations')
      .select('station_name, km')
      .in('station_name', [origin, destination]);

    if (stData && stData.length === 2) {
      const diff = Math.abs(stData[0].km - stData[1].km);
      setDistance(diff);
    }

    const { data: tripData, error } = await supabase
      .from('trips')
      .select(`
        id,
        status,
        trains!inner (
          type,
          departure_time
        )
      `)
      .eq('trains.type', trainType) 
      .eq('status', 'Scheduled'); 
    
    if (tripData) {
      const formatted = tripData.map((t: any) => ({
        id: t.id,
        dep: t.trains.departure_time.substring(0, 5) 
      }));
      formatted.sort((a, b) => a.dep.localeCompare(b.dep));
      setRealSchedules(formatted);
    }

    setLoading(false);
  };

  const getArrivalTime = (depTime: string) => {
    const avgSpeed = trainType === 'รถด่วนพิเศษ' ? 70 : 50;
    const travelHours = distance / avgSpeed;
    
    const [h, m] = depTime.split(':').map(Number);
    let arrivalH = h + Math.floor(travelHours);
    let arrivalM = m + Math.round((travelHours % 1) * 60);
    
    if (arrivalM >= 60) { arrivalH += 1; arrivalM -= 60; }
    if (arrivalH >= 24) arrivalH -= 24;

    return `${arrivalH.toString().padStart(2, '0')}:${arrivalM.toString().padStart(2, '0')}`;
  };

  const getDurationText = () => {
    const avgSpeed = trainType === 'รถด่วนพิเศษ' ? 70 : 50;
    const totalMinutes = Math.round((distance / avgSpeed) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}ชม. ${m}น.`;
  };

  return (
    <View style={styles.mainContainer}>
      
      {/* 🌊 Header สีน้ำเงินเข้มแบบใหม่ */}
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
        
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>เวลาออกเดินทาง</Text>
            <View style={{width: 40}} />
          </View>

          {/* 📍 สรุปเส้นทางโปร่งแสง */}
          <View style={styles.routeSummaryBox}>
            <View style={styles.routeCol}>
              <Text style={styles.routeCity} numberOfLines={1}>{origin}</Text>
              <Text style={styles.routeTimeSmall}>{realSchedules[0] ? realSchedules[0].dep : '--:--'}น.</Text>
            </View>
            <View style={styles.routeCenter}>
              <Ionicons name="arrow-forward" size={24} color="#D1C4E9" />
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>{getDurationText()}</Text>
              </View>
            </View>
            <View style={styles.routeCol}>
              <Text style={styles.routeCity} numberOfLines={1}>{destination}</Text>
              <Text style={styles.routeTimeSmall}>{realSchedules[0] ? getArrivalTime(realSchedules[0].dep) : '--:--'}น.</Text>
            </View>
          </View>

        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.dateSubTitle}>{departureDate} • {realSchedules.length} เที่ยว</Text>

          {realSchedules.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="train-outline" size={50} color="#E0E0E0" />
                <Text style={styles.emptyText}>ไม่มีรอบรถ {trainType} ในระบบ</Text>
            </View>
          ) : (
            realSchedules.map((item, index) => {
              const isFull = index === 1; // สมมติสถานะเต็มไว้ทดสอบ UI

              return (
                <View key={item.id} style={[styles.tripCard, isFull && styles.tripCardFull]}>
                  
                  {/* ด้านบนของการ์ด */}
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.trainInfoMain}>{trainType} • {destination}</Text>
                    <Text style={styles.trainInfoSub}>{cabinClass}</Text>
                  </View>

                  {/* 🚀 แก้ไขตรงนี้: แถวของเวลาและลูกศร ให้อยู่ระดับเดียวกันเป๊ะ! */}
                  <View style={styles.timeRow}>
                    <View style={styles.timeSideBlock}><Text style={styles.timeHuge}>{item.dep}</Text></View>
                    <View style={styles.arrowBlock}>
                      <View style={styles.arrowLine} />
                      <Ionicons name="caret-forward" size={16} color="#9E9E9E" style={styles.arrowHead} />
                    </View>
                    <View style={[styles.timeSideBlock, {alignItems: 'flex-end'}]}><Text style={styles.timeHuge}>{getArrivalTime(item.dep)}</Text></View>
                  </View>

                  {/* แถวของชื่อสถานีและระยะเวลา */}
                  <View style={styles.stationRow}>
                    <View style={styles.stationSideBlock}><Text style={styles.stationSmall} numberOfLines={1}>{origin}</Text></View>
                    <View style={styles.durationBlock}><Text style={styles.durationTextCenter}>{getDurationText()}</Text></View>
                    <View style={[styles.stationSideBlock, {alignItems: 'flex-end'}]}><Text style={styles.stationSmall} numberOfLines={1}>{destination}</Text></View>
                  </View>

                  <View style={styles.dashedDivider} />

                  {/* ด้านล่าง (สถานะ + ปุ่ม) */}
                  <View style={styles.cardBottom}>
                    <View style={styles.statusGroup}>
                      {isFull ? (
                        <>
                          <Ionicons name="close" size={20} color="#F44336" />
                          <Text style={styles.statusFullText}>ที่นั่งเต็มแล้ว</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#4CAF50" />
                          <Text style={styles.statusAvailableText}>ที่นั่งว่าง</Text>
                        </>
                      )}
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.selectBtn, isFull && styles.selectBtnDisabled]}
                      onPress={() => {
                        router.push({
                          pathname: '/(booking)/select-seat',
                          params: { ...params, depTime: item.dep, arrTime: getArrivalTime(item.dep), duration: getDurationText(), trip_id: item.id }
                        })
                      }}
                    >
                      <Text style={[styles.selectBtnText, isFull && styles.selectBtnTextDisabled]}>เลือกเที่ยวนี้</Text>
                    </TouchableOpacity>
                  </View>
                  
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

// 📐 สไตล์
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  
  blueHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 40, overflow: 'hidden' },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2E3166' },
  headerSafeArea: { paddingHorizontal: 20, paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  routeSummaryBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25, paddingVertical: 15, paddingHorizontal: 20, marginBottom: 10 },
  routeCol: { flex: 1, alignItems: 'center' },
  routeCity: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  routeTimeSmall: { fontSize: 10, color: '#9E9E9E', marginTop: 2 },
  routeCenter: { width: 80, alignItems: 'center', justifyContent: 'center' },
  durationBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 5 },
  durationBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingBottom: 50 },
  dateSubTitle: { fontSize: 14, color: '#757575', marginBottom: 20, marginLeft: 5 },

  tripCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#EEEEEE', overflow: 'hidden' },
  tripCardFull: { borderLeftWidth: 4, borderLeftColor: '#F44336' },

  cardHeaderInfo: { marginBottom: 20 },
  trainInfoMain: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  trainInfoSub: { fontSize: 11, color: '#9E9E9E', marginTop: 2 },

  // 🚀 ปรับเลย์เอาต์เวลาและสถานีใหม่
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeSideBlock: { flex: 1, alignItems: 'flex-start' },
  timeHuge: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  
  arrowBlock: { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  arrowLine: { flex: 1, height: 2, backgroundColor: '#BDBDBD' },
  arrowHead: { marginLeft: -5 },
  
  stationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  stationSideBlock: { flex: 1, alignItems: 'flex-start' },
  stationSmall: { fontSize: 10, color: '#9E9E9E' },
  durationBlock: { flex: 1.5, alignItems: 'center' },
  durationTextCenter: { fontSize: 10, color: '#9E9E9E' },

  dashedDivider: { height: 1, width: '100%', borderWidth: 1, borderStyle: 'dashed', borderColor: '#E0E0E0', borderRadius: 1, marginVertical: 20 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusGroup: { flexDirection: 'row', alignItems: 'center' },
  statusAvailableText: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50', marginLeft: 5 },
  statusFullText: { fontSize: 12, fontWeight: 'bold', color: '#F44336', marginLeft: 5 },

  selectBtn: { backgroundColor: '#5E35B1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  selectBtnDisabled: { backgroundColor: '#F5F5F5' },
  selectBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  selectBtnTextDisabled: { color: '#9E9E9E' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 16 },
});
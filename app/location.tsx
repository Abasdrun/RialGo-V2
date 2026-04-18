import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router'; 
// 🚀 เปลี่ยนมาใช้ Polyline ธรรมดา ลากเส้นผ่านสถานีเลย ไม่ต้องง้อ Directions API เสียเงิน!
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'; 
import * as Location from 'expo-location'; 
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

interface Ticket {
  id: string;
  refCode: string;
  trainName: string;
  origin: string;
  dest: string;
  depTime: string;
  arrTime: string;
  duration: string;
  date: string;
  seat: string;
  cabin: string;
  pax: number;
  classType: string;
  originCoords: { latitude: number, longitude: number }; 
  destCoords: { latitude: number, longitude: number };
  routeCoords: { latitude: number, longitude: number }[];
  prevStation: string;
  nextStation: string;
  timeToNext: string;
}

export default function LocationScreen() {
  const pathname = usePathname(); 
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [location, setLocation] = useState<any>(null);

  const [activeMapTicket, setActiveMapTicket] = useState<Ticket | null>(null);
  const [activeAlertTicket, setActiveAlertTicket] = useState<Ticket | null>(null);

  // State สำหรับ Demo Mode
  const [fullRoute, setFullRoute] = useState<any[]>([]);
  const [demoCoord, setDemoCoord] = useState<any>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const demoIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchActiveTickets();
    requestLocationPermission();

    let subscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 500 },
          (newLoc) => setLocation(newLoc.coords)
        );
      }
    })();
    return () => subscription?.remove();
  }, []);

  const handleTabPress = (tabPath: string) => {
    if (pathname !== tabPath) {
      router.replace(tabPath as any);
    }
  };

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc.coords);
    }
  };

  const parseCabinAndSeats = (seatsStr: string) => {
    if (!seatsStr || seatsStr === 'undefined') return { cabin: '-', seats: '-', count: 1 };
    const seatArr = seatsStr.split(',').map(s => s.trim());
    const cabin = seatArr[0].split('-')[0] || '-';
    const seats = seatArr.map(s => s.split('-')[1] || s).join(', ');
    return { cabin, seats, count: seatArr.length };
  };

  const calculateRealDuration = (dep: string, arr: string) => {
    if (!dep || !arr || dep === '00:00') return '--ชม. --น.';
    const [dh, dm] = dep.split(':').map(Number);
    const [ah, am] = arr.split(':').map(Number);
    let mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    return `${Math.floor(mins / 60)}ชม. ${mins % 60}น.`;
  };

  const fetchActiveTickets = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id, status, selected_seats, created_at, origin_station_id, destination_station_id,
            trips ( id, train_id, departure_date, trains ( type, train_number ) ),
            origin:origin_station_id ( station_name, latitude, longitude, km ), 
            dest:destination_station_id ( station_name, latitude, longitude, km )
          `)
          .eq('user_id', user.id).eq('status', 'Confirmed') 
          .order('created_at', { ascending: false });

        if (bookings && bookings.length > 0) {
          const formattedTickets = await Promise.all(bookings.map(async (b: any) => {
            let exactDep = '18:30'; 
            let exactArr = '01:00';
            let routeCoords: any[] = [];
            let prevS = b.origin?.station_name;
            let nextS = b.dest?.station_name;
            let ttNext = '-- นาที';

            if (b.trips?.train_id) {
               const { data: stops } = await supabase
                .from('train_stops')
                .select('station_id, departure_time, arrival_time, stop_order, stations(station_name, latitude, longitude, km)')
                .eq('train_id', b.trips.train_id)
                .order('stop_order', { ascending: true });

               if (stops) {
                  const now = new Date();
                  const curT = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  
                  const nextStopIndex = stops.findIndex(s => (s.arrival_time || s.departure_time) > curT);
                  
                  if (nextStopIndex !== -1) {
                    const nStop = stops[nextStopIndex];
                    nextS = nStop.stations.station_name;
                    
                    const prevStopIndex = nextStopIndex - 1;
                    if (prevStopIndex >= 0) {
                      prevS = stops[prevStopIndex].stations.station_name;
                    } else {
                      prevS = b.origin.station_name; 
                    }

                    if (nStop.arrival_time) {
                      const [ah, am] = nStop.arrival_time.split(':').map(Number);
                      let diff = (ah * 60 + am) - (now.getHours() * 60 + now.getMinutes());
                      ttNext = diff > 0 ? `${diff} นาที` : 'กำลังจอด';
                    }
                  } else {
                    prevS = stops[stops.length - 2]?.stations?.station_name || b.origin.station_name;
                    nextS = stops[stops.length - 1]?.stations?.station_name || b.dest.station_name;
                    ttNext = 'ใกล้ถึงปลายทาง';
                  }

                  const oStop = stops.find(s => s.station_id === b.origin_station_id);
                  const dStop = stops.find(s => s.station_id === b.destination_station_id);
                  if (oStop?.departure_time) exactDep = oStop.departure_time.substring(0, 5);
                  if (dStop?.arrival_time) exactArr = dStop.arrival_time.substring(0, 5);

                  // ดึงพิกัดสถานีทั้งหมดที่รถไฟผ่าน
                  const sIdx = stops.findIndex(s => s.station_id === b.origin_station_id);
                  const eIdx = stops.findIndex(s => s.station_id === b.destination_station_id);
                  if (sIdx !== -1 && eIdx !== -1) {
                    const path = sIdx < eIdx ? stops.slice(sIdx, eIdx + 1) : stops.slice(eIdx, sIdx + 1);
                    routeCoords = path
                        .filter((s: any) => s.stations && s.stations.latitude !== null)
                        .map((s: any) => ({ latitude: parseFloat(s.stations.latitude), longitude: parseFloat(s.stations.longitude) }));
                  }
               }
            }

            const { cabin, seats, count } = parseCabinAndSeats(b.selected_seats);
            return {
              id: b.id.toString(),
              refCode: `TH ${new Date(b.created_at).getFullYear()}-${String(b.id).padStart(5, '0')}`,
              trainName: `${b.trips?.trains?.type || 'ด่วนพิเศษ'} ${b.trips?.trains?.train_number || '7'}`,
              origin: b.origin?.station_name || 'ไม่ระบุ',
              dest: b.dest?.station_name || 'ไม่ระบุ',
              depTime: exactDep, arrTime: exactArr,
              duration: calculateRealDuration(exactDep, exactArr),
              date: b.trips?.departure_date,
              seat: seats, cabin: cabin, pax: count,
              classType: b.trips?.trains?.type === 'รถด่วนพิเศษ' ? 'ชั้น 2' : 'ชั้น 3',
              originCoords: { latitude: parseFloat(b.origin?.latitude) || 0, longitude: parseFloat(b.origin?.longitude) || 0 },
              destCoords: { latitude: parseFloat(b.dest?.latitude) || 0, longitude: parseFloat(b.dest?.longitude) || 0 },
              routeCoords: routeCoords, prevStation: prevS, nextStation: nextS, timeToNext: ttNext
            };
          }));
          setTickets(formattedTickets.filter(t => t !== null) as Ticket[]);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // 🚀 ฟังก์ชันเปิดแผนที่ และสร้างพิกัดจำลองให้รถไฟวิ่งสมูทๆ
  const openMapModal = (ticket: Ticket) => {
    setActiveMapTicket(ticket);
    
    // สร้างเส้นทางจำลองให้มันเนียนๆ (ซอยจุดพิกัดเพิ่มระหว่างสถานี)
    let smoothRoute = [];
    if (ticket.routeCoords && ticket.routeCoords.length > 1) {
      for (let i = 0; i < ticket.routeCoords.length - 1; i++) {
        const start = ticket.routeCoords[i];
        const end = ticket.routeCoords[i+1];
        const steps = 20; // ซอย 20 จุดระหว่างแต่ละสถานี
        for (let j = 0; j < steps; j++) {
          smoothRoute.push({
            latitude: start.latitude + (end.latitude - start.latitude) * (j / steps),
            longitude: start.longitude + (end.longitude - start.longitude) * (j / steps)
          });
        }
      }
      smoothRoute.push(ticket.routeCoords[ticket.routeCoords.length - 1]); // ใส่จุดสุดท้าย
    } else {
      smoothRoute = ticket.routeCoords || [];
    }
    setFullRoute(smoothRoute);
  };

  // 🚀 ฟังก์ชันเริ่มการจำลองวิ่ง (Demo Mode)
  const startDemoJourney = () => {
    if (fullRoute.length === 0) {
      alert("ไม่พบข้อมูลเส้นทางในระบบ");
      return;
    }
    
    setIsDemoRunning(true);
    let currentIndex = 0;
    const totalPoints = fullRoute.length;
    
    setDemoCoord(fullRoute[0]);

    demoIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      
      if (currentIndex >= totalPoints) {
        currentIndex = totalPoints - 1;
        clearInterval(demoIntervalRef.current);
        setIsDemoRunning(false);
      }
      
      setDemoCoord(fullRoute[currentIndex]);

      // ⏰ นาฬิกาปลุก: ถึงจุด 85% ของเส้นทาง ให้สั่น + เด้งเตือน!
      const triggerPoint = Math.floor(totalPoints * 0.85);
      if (currentIndex === triggerPoint) {
        Vibration.vibrate([500, 500, 500]); // สั่น 3 ทีรัวๆ
        setActiveAlertTicket(activeMapTicket);
      }
    }, 100); // รถไฟขยับทุกๆ 0.1 วินาที (เร็วทันใจตอนพรีเซนต์)
  };

  const closeMapModal = () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    setIsDemoRunning(false);
    setDemoCoord(null);
    setFullRoute([]);
    setActiveMapTicket(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.blueHeaderBg}><View style={styles.headerGraphicCircle} /></View>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Location</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {tickets.map((ticket, index) => (
              <View key={index} style={styles.locationCard}>
                <View style={styles.routeRow}>
                  <View style={{flex: 1}}><Text style={styles.cityText} numberOfLines={1}>{ticket.origin}</Text><Text style={styles.timeText}>{ticket.depTime}</Text></View>
                  <View style={styles.arrowContainer}><Text style={styles.durationText}>{ticket.duration}</Text><Ionicons name="caret-forward" size={16} color="#BDBDBD" style={{marginTop: -8}} /></View>
                  <View style={{flex: 1, alignItems: 'flex-end'}}><Text style={styles.cityText} numberOfLines={1}>{ticket.dest}</Text><Text style={styles.timeText}>{ticket.arrTime}</Text></View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}><Ionicons name="alarm-outline" size={12} color="#9E9E9E" /><Text style={styles.infoText}> {ticket.trainName}</Text></View>
                  <View style={styles.infoItem}><MaterialCommunityIcons name="seat-passenger" size={12} color="#9E9E9E" /><Text style={styles.infoText}> {ticket.classType} · ที่นั่ง {ticket.seat}</Text></View>
                </View>
                {/* 🚀 เปลี่ยนมาเรียก openMapModal แทน */}
                <TouchableOpacity style={styles.mapBtn} onPress={() => openMapModal(ticket)}>
                  <Ionicons name="map-outline" size={16} color="#262956" /><Text style={styles.mapBtnText}> แผนที่เดินทาง</Text>
                </TouchableOpacity>
              </View>
            ))}
            {tickets.length === 0 && <View style={styles.emptyState}><Ionicons name="location-outline" size={50} color="#BDBDBD" /><Text style={styles.emptyText}>ไม่มีการเดินทางในขณะนี้</Text></View>}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* 🧭 MODAL แผนที่ */}
      <Modal visible={!!activeMapTicket} animationType="slide" transparent>
        <View style={styles.modalFullBgWhite}>
          <View style={styles.mapHeaderBg}>
             <SafeAreaView edges={['top']}>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={closeMapModal} style={styles.backBtnCircle}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                  <Text style={styles.modalHeaderTitleCenter}>Location Tracking</Text>
                  <View style={{width: 40}} />
                </View>
                <View style={styles.stationProgressRow}>
                  <View style={styles.progressDotSmall} /><View style={styles.progressLine} />
                  <View style={styles.progressDotActive}><View style={styles.progressDotInner} /></View>
                  <View style={styles.progressLine} /><View style={styles.progressDotSmall} />
                </View>
                <View style={styles.stationNameRow}>
                  <Text style={styles.stationNameLabel} numberOfLines={1}>{activeMapTicket?.prevStation}</Text>
                  <Text style={styles.stationNameLabel}>ตำแหน่งของคุณ</Text>
                  <Text style={styles.stationNameLabel} numberOfLines={1}>{activeMapTicket?.nextStation}</Text>
                </View>
             </SafeAreaView>
          </View>
          
          <View style={styles.mapContainer}>
            <MapView 
              provider={PROVIDER_GOOGLE} 
              style={styles.map} 
              initialRegion={{ latitude: activeMapTicket?.originCoords.latitude || 13.75, longitude: activeMapTicket?.originCoords.longitude || 100.5, latitudeDelta: 5.0, longitudeDelta: 5.0 }} 
              showsUserLocation={true}
            >
              {/* 🚀 ลากเส้นสีม่วงผ่านสถานีต่างๆ (ใช้ Polyline แทนทิ้ง API Key ไปได้เลย!) */}
              {activeMapTicket && activeMapTicket.routeCoords.length > 0 && (
                <Polyline 
                  coordinates={activeMapTicket.routeCoords}
                  strokeWidth={5}
                  strokeColor="#5E35B1"
                />
              )}

              {activeMapTicket && <Marker coordinate={activeMapTicket.originCoords} title={activeMapTicket.origin} pinColor="red" />}
              {activeMapTicket && <Marker coordinate={activeMapTicket.destCoords} title={activeMapTicket.dest} pinColor="blue" />}
              
              {/* 🚄 ไอคอนรถไฟขยับได้ สำหรับตอนกดจำลองการเดินทาง */}
              {demoCoord && (
                <Marker coordinate={demoCoord} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.trainMarkerBox}>
                    <Ionicons name="train" size={20} color="#FFF" />
                  </View>
                </Marker>
              )}
            </MapView>

            {/* 🔘 ปุ่มลับ! กดจำลองการวิ่งให้รถไฟขยับไปหาปลายทาง */}
            <TouchableOpacity 
              style={[styles.demoFloatingBtn, isDemoRunning && {backgroundColor: '#9E9E9E'}]} 
              onPress={startDemoJourney}
              disabled={isDemoRunning}
            >
              <Ionicons name={isDemoRunning ? "train" : "play"} size={20} color="#FFF" />
              <Text style={styles.demoFloatingBtnText}>
                {isDemoRunning ? 'กำลังเดินทาง...' : 'จำลองการเดินทาง'}
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.mapBottomCard}>
             <View style={styles.mapRouteInfoRow}>
                <View style={styles.mapInfoBox}><Text style={styles.mapLabelSub}>สถานีล่าสุด</Text><Text style={styles.mapLabelMain}>{activeMapTicket?.prevStation}</Text></View>
                <Ionicons name="arrow-forward" size={20} color="#757575" />
                <View style={styles.mapInfoBox}><Text style={styles.mapLabelSub}>สถานีถัดไป</Text><Text style={styles.mapLabelMain}>{activeMapTicket?.nextStation}</Text></View>
             </View>
             <View style={styles.mapStatsRow}>
                <View style={styles.mapStatItem}><Text style={styles.mapLabelSub}>อีกประมาณ</Text><Text style={styles.mapStatValue}>{activeMapTicket?.timeToNext}</Text></View>
                <View style={styles.mapStatItem}><Text style={styles.mapLabelSub}>ขบวนรถ</Text><Text style={styles.mapStatValue}>{activeMapTicket?.trainName}</Text></View>
             </View>
             <TouchableOpacity style={{position: 'absolute', top: 10, right: 10, padding: 10}} onPress={() => { setActiveAlertTicket(activeMapTicket); }}>
                 <Ionicons name="notifications-circle" size={30} color="#FFF" />
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ⏰ MODAL แจ้งเตือนสถานี */}
      <Modal visible={!!activeAlertTicket} animationType="slide" transparent>
        <View style={styles.modalFullBgWhite}>
          <View style={styles.mapHeaderBg}>
             <SafeAreaView edges={['top']}>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={() => { setActiveAlertTicket(null); Vibration.cancel(); }} style={styles.backBtnCircle}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                  <Text style={styles.modalHeaderTitleCenter}>แจ้งเตือนสถานี</Text>
                  <View style={{width: 40}} />
                </View>
                <View style={styles.stationProgressRow}><View style={styles.progressDotSmall} /><View style={styles.progressLine} /><View style={styles.progressDotActive}><View style={styles.progressDotInner} /></View><View style={styles.progressLine} /><View style={styles.progressDotSmall} /></View>
             </SafeAreaView>
          </View>
          <View style={styles.alertCardContainer}>
             <View style={styles.alertDarkCard}>
                <View style={styles.alertIconWrapper}><Ionicons name="alarm-outline" size={80} color="#FFF" /></View>
                <Text style={styles.alertHugeTime}>20</Text><Text style={styles.alertMinText}>นาที</Text>
                <View style={styles.alertWarningBox}><Text style={styles.alertWarningTitle}>อีก 20 นาที จะถึงสถานีปลายทาง</Text><Text style={styles.alertWarningSub}>กรุณาเตรียมสัมภาระและบัตรโดยสาร</Text></View>
                <View style={styles.alertNextStationBox}><View style={styles.alertNextIcon}><Ionicons name="train" size={24} color="#5E35B1" /></View><View style={{flex: 1}}><Text style={styles.alertLabelGrey}>สถานีปลายทาง</Text><Text style={styles.alertStationBig} numberOfLines={1}>{activeAlertTicket?.dest}</Text><Text style={styles.alertLabelGrey}>{activeAlertTicket?.arrTime}</Text></View></View>
                <View style={styles.alertActionRow}>
                  <View style={styles.alertSeatBox}><Text style={styles.alertGreenText}>ที่นั่งของคุณ</Text><Text style={styles.alertSeatTextMain}>ที่นั่ง {activeAlertTicket?.seat} · ตู้ {activeAlertTicket?.cabin}</Text></View>
                  <TouchableOpacity style={styles.alertMapBtn} onPress={() => { setActiveAlertTicket(null); Vibration.cancel(); }}>
                    <Ionicons name="map-outline" size={20} color="#FFF" /><Text style={styles.alertMapBtnText}>กลับไปแผนที่</Text>
                  </TouchableOpacity>
                </View>
             </View>
          </View>
        </View>
      </Modal>

      {/* 🚀 Bottom Tab Bar */}
      <View style={styles.bottomTabContainer}>
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/')}><Ionicons name={pathname === '/' ? "home" : "home-outline"} size={24} color={pathname === '/' ? "#5E35B1" : "#757575"} /><Text style={[styles.tabItemText, pathname === '/' && styles.tabItemTextActive]}>Home</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/location')}><Ionicons name={pathname === '/location' ? "location" : "location-outline"} size={26} color={pathname === '/location' ? "#5E35B1" : "#757575"} /><Text style={[styles.tabItemText, pathname === '/location' && styles.tabItemTextActive]}>Location</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/profile')}><Ionicons name={pathname === '/profile' ? "person-circle" : "person-circle-outline"} size={24} color={pathname === '/profile' ? "#5E35B1" : "#757575"} /><Text style={[styles.tabItemText, pathname === '/profile' && styles.tabItemTextActive]}>My Profile</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// 🛡️ Styles คงเดิมเป๊ะๆ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  safeArea: { flex: 1, zIndex: 1 },
  blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: '#2E3165', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, zIndex: 0 },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingRight: 15, borderRadius: 20 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  scrollContent: { padding: 20, paddingTop: 30, paddingBottom: 120 },
  locationCard: { backgroundColor: '#FFFDFD', borderRadius: 25, marginBottom: 20, elevation: 4, padding: 20, paddingBottom: 0 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cityText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  arrowContainer: { alignItems: 'center', flex: 1, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', marginHorizontal: 15, paddingBottom: 5 },
  durationText: { fontSize: 10, color: '#BDBDBD', marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  infoText: { fontSize: 11, color: '#757575' },
  mapBtn: { backgroundColor: '#EBE4FF', alignSelf: 'flex-end', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginTop: -15, marginBottom: 15, marginRight: -5 },
  mapBtnText: { color: '#5E35B1', fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 16 },
  bottomTabContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, zIndex: 1000 },
  bottomTabBar: { flex: 1, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', elevation: 15 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabItemText: { fontSize: 10, color: '#757575', marginTop: 4 },
  tabItemTextActive: { color: '#5E35B1', fontWeight: 'bold' },
  modalFullBgWhite: { flex: 1, backgroundColor: '#F9F9F9' }, 
  mapHeaderBg: { backgroundColor: '#2E3165', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  modalHeaderTitleCenter: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  stationProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginBottom: 10 },
  progressDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EBE4FF' },
  progressDotActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  progressDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#FFF', marginHorizontal: -2 },
  stationNameRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30 },
  stationNameLabel: { color: '#D1C4E9', fontSize: 10, maxWidth: 100, textAlign: 'center' },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  mapBottomCard: { backgroundColor: '#1E2046', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  mapRouteInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#3A3C59', paddingBottom: 20, marginBottom: 20 },
  mapInfoBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15 },
  mapLabelSub: { color: '#A8AACC', fontSize: 10, marginBottom: 2 },
  mapLabelMain: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  mapStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mapStatItem: { flex: 1, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15, paddingVertical: 10, alignItems: 'center', marginHorizontal: 2 },
  mapStatValue: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  alertCardContainer: { flex: 1, padding: 20, marginTop: 10 },
  alertDarkCard: { backgroundColor: '#1E2046', borderRadius: 30, padding: 25, flex: 1, alignItems: 'center' },
  alertIconWrapper: { marginTop: 10, marginBottom: 10 },
  alertHugeTime: { fontSize: 70, fontWeight: 'bold', color: '#FFF', lineHeight: 80 },
  alertMinText: { fontSize: 18, color: '#FFF', marginBottom: 20 },
  alertWarningBox: { width: '100%', borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, alignItems: 'center', marginBottom: 20 },
  alertWarningTitle: { color: '#F44336', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  alertWarningSub: { color: '#A8AACC', fontSize: 10 },
  alertNextStationBox: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, marginBottom: 20 },
  alertNextIcon: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(94,53,177,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertLabelGrey: { color: '#A8AACC', fontSize: 10 },
  alertStationBig: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginVertical: 2 },
  alertActionRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  alertSeatBox: { flex: 1, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, marginRight: 10 },
  alertGreenText: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  alertSeatTextMain: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  alertMapBtn: { flex: 0.8, backgroundColor: '#3A3C59', borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#5E35B1' },
  alertMapBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  demoFloatingBtn: { position: 'absolute', top: 20, left: 20, backgroundColor: '#FF7043', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  demoFloatingBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  trainMarkerBox: { backgroundColor: '#5E35B1', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }
});
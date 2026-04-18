import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, Vibration, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router'; 
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'; 
import * as Location from 'expo-location'; 
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

interface PathStop {
  name: string;
  lat: number;
  lng: number;
  time: string;
}

interface Ticket {
  id: string;
  origin: string;
  dest: string;
  depTime: string;
  arrTime: string;
  duration: string;
  date: string; 
  originCoords: { latitude: number, longitude: number }; 
  destCoords: { latitude: number, longitude: number };
  pathStops: PathStop[]; 
  routeCoords: { latitude: number, longitude: number }[];
}

export default function LocationScreen() {
  const pathname = usePathname(); 
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [location, setLocation] = useState<any>(null);

  const [activeMapTicket, setActiveMapTicket] = useState<Ticket | null>(null);
  const [activeAlertTicket, setActiveAlertTicket] = useState<Ticket | null>(null);

  const [fullRoute, setFullRoute] = useState<any[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const demoIntervalRef = useRef<any>(null);
  
  const [demoState, setDemoState] = useState({
    coord: null as any,
    currentStation: '--',
    nextStation: '--',
    delayMins: 0,
    remainingMins: 0 
  });

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

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return 'ไม่ระบุวันที่';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const calculateRealDuration = (dep: string, arr: string) => {
    if (!dep || !arr || dep.includes('-') || arr.includes('-') || dep === '00:00' || arr === '00:00') return '--ชม. --น.';
    const [dh, dm] = dep.split(':').map(Number);
    const [ah, am] = arr.split(':').map(Number);
    let mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    return `${Math.floor(mins / 60)}ชม. ${mins % 60}น.`;
  };

  const getDurationInMinutes = (durationStr: string) => {
    let total = 0;
    const hrMatch = durationStr.match(/(\d+)ชม\./);
    const minMatch = durationStr.match(/(\d+)น\./);
    if (hrMatch) total += parseInt(hrMatch[1], 10) * 60;
    if (minMatch) total += parseInt(minMatch[1], 10);
    return total === 0 ? 120 : total; 
  };

  const formatRemainingTime = (mins: number) => {
    if (mins <= 0) return 'ถึงปลายทางแล้ว';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h} ชม. ${m} นาที`;
    return `${m} นาที`;
  };

  const fetchActiveTickets = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at, origin_station_id, destination_station_id,
            trips ( train_id, departure_date ),
            origin:origin_station_id ( station_name, latitude, longitude ), 
            dest:destination_station_id ( station_name, latitude, longitude )
          `)
          .eq('user_id', user.id).eq('status', 'Confirmed') 
          .order('created_at', { ascending: false });

        if (bookings && bookings.length > 0) {
          const formattedTickets = await Promise.all(bookings.map(async (b: any) => {
            let exactDep = '--:--'; 
            let exactArr = '--:--';
            let pathStops: PathStop[] = [];
            let routeCoords: any[] = [];

            if (b.trips?.train_id) {
               const { data: stops } = await supabase
                .from('train_stops')
                .select('station_id, departure_time, arrival_time, stop_order, stations(station_name, latitude, longitude)')
                .eq('train_id', b.trips.train_id)
                .order('stop_order', { ascending: true });

               if (stops) {
                  const originStop = stops.find(s => s.station_id == b.origin_station_id);
                  const destStop = stops.find(s => s.station_id == b.destination_station_id);
                  
                  if (originStop) exactDep = (originStop.departure_time || originStop.arrival_time || '--:--').substring(0, 5);
                  if (destStop) exactArr = (destStop.arrival_time || destStop.departure_time || '--:--').substring(0, 5);

                  const sIdx = stops.findIndex(s => s.station_id == b.origin_station_id);
                  const eIdx = stops.findIndex(s => s.station_id == b.destination_station_id);
                  
                  if (sIdx !== -1 && eIdx !== -1) {
                    // 🚀 [แก้บั๊ก] เช็คลำดับ Array เผื่อรถไฟวิ่งสลับฝั่ง ต้อง .reverse() ให้เรียงถูกจากต้นทางไปปลายทาง
                    let rawPath = [];
                    if (sIdx <= eIdx) {
                       rawPath = stops.slice(sIdx, eIdx + 1);
                    } else {
                       rawPath = stops.slice(eIdx, sIdx + 1).reverse(); 
                    }
                    
                    pathStops = rawPath.map(s => ({
                        name: s.stations?.station_name || 'ไม่ระบุ',
                        lat: parseFloat(s.stations?.latitude) || 0,
                        lng: parseFloat(s.stations?.longitude) || 0,
                        time: (s.arrival_time || s.departure_time || '--:--').substring(0, 5)
                    })).filter(s => s.lat !== 0 && s.lng !== 0);

                    routeCoords = pathStops.map(s => ({ latitude: s.lat, longitude: s.lng }));
                  }
               }
            }

            if (routeCoords.length === 0 && parseFloat(b.origin?.latitude) && parseFloat(b.dest?.latitude)) {
               const oLat = parseFloat(b.origin.latitude); const oLng = parseFloat(b.origin.longitude);
               const dLat = parseFloat(b.dest.latitude); const dLng = parseFloat(b.dest.longitude);
               
               pathStops = [
                 { name: b.origin.station_name, lat: oLat, lng: oLng, time: exactDep },
                 { name: b.dest.station_name, lat: dLat, lng: dLng, time: exactArr }
               ];
               routeCoords = [ { latitude: oLat, longitude: oLng }, { latitude: dLat, longitude: dLng } ];
            }

            return {
              id: b.id.toString(),
              origin: b.origin?.station_name || 'ไม่ระบุ',
              dest: b.dest?.station_name || 'ไม่ระบุ',
              depTime: exactDep, arrTime: exactArr,
              duration: calculateRealDuration(exactDep, exactArr),
              date: b.trips?.departure_date || b.created_at,
              originCoords: { latitude: parseFloat(b.origin?.latitude) || 0, longitude: parseFloat(b.origin?.longitude) || 0 },
              destCoords: { latitude: parseFloat(b.dest?.latitude) || 0, longitude: parseFloat(b.dest?.longitude) || 0 },
              pathStops: pathStops,
              routeCoords: routeCoords
            };
          }));
          
          setTickets(formattedTickets.filter(t => t !== null) as Ticket[]);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const openMapModal = (ticket: Ticket) => {
    if (!ticket.routeCoords || ticket.routeCoords.length < 2) {
      Alert.alert('ข้อมูลไม่สมบูรณ์', 'ตั๋วใบนี้ยังไม่มีพิกัดสถานีในระบบ ไม่สามารถเปิดแผนที่ได้ครับ');
      return;
    }

    setActiveMapTicket(ticket);
    const totalDurationMins = getDurationInMinutes(ticket.duration);
    
    let smoothRoute = [];
    const stops = ticket.pathStops;

    if (stops && stops.length > 1) {
      for (let i = 0; i < stops.length - 1; i++) {
        const start = stops[i];
        const end = stops[i+1];
        const steps = 25; 

        for (let j = 0; j < steps; j++) {
          smoothRoute.push({
            latitude: start.lat + (end.lat - start.lat) * (j / steps),
            longitude: start.lng + (end.lng - start.lng) * (j / steps),
            currentStation: start.name,
            nextStation: end.name
          });
        }
      }
      const last = stops[stops.length - 1];
      smoothRoute.push({
        latitude: last.lat, longitude: last.lng,
        currentStation: last.name, nextStation: "ถึงปลายทางแล้ว"
      });
    }

    setFullRoute(smoothRoute);
    
    setDemoState({
        coord: null,
        currentStation: stops[0]?.name || '--',
        nextStation: stops[1]?.name || '--',
        delayMins: 0,
        remainingMins: totalDurationMins 
    });
  };

  const startDemoJourney = () => {
    if (fullRoute.length === 0) return;
    
    setIsDemoRunning(true);
    let currentIndex = 0;
    const totalPoints = fullRoute.length;
    const totalMins = activeMapTicket ? getDurationInMinutes(activeMapTicket.duration) : 120;
    
    const fakeDelay = Math.floor(Math.random() * 15) + 5;

    demoIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      
      if (currentIndex >= totalPoints) {
        currentIndex = totalPoints - 1;
        clearInterval(demoIntervalRef.current);
        setIsDemoRunning(false);
      }
      
      const point = fullRoute[currentIndex];
      const currentRemaining = Math.ceil(totalMins * ((totalPoints - 1 - currentIndex) / (totalPoints - 1)));

      setDemoState({
          coord: { latitude: point.latitude, longitude: point.longitude },
          currentStation: point.currentStation, 
          nextStation: point.nextStation,       
          delayMins: fakeDelay,
          remainingMins: currentRemaining 
      });

      const triggerPoint = Math.floor(totalPoints * 0.85);
      if (currentIndex === triggerPoint) {
        Vibration.vibrate([500, 500, 500]); 
        setActiveAlertTicket(activeMapTicket);
      }
    }, 120); 
  };

  const closeMapModal = () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    setIsDemoRunning(false);
    setDemoState({ coord: null, currentStation: '--', nextStation: '--', delayMins: 0, remainingMins: 0 });
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
                
                {/* 🚀 ลบรหัส #TH ยาวๆ ออก เหลือแค่วันที่เดินทางให้ดูคลีนๆ */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#5E35B1" />
                    <Text style={styles.dateBadgeText}>{formatThaiDate(ticket.date)}</Text>
                  </View>
                </View>

                <View style={styles.routeRow}>
                  <View style={{flex: 1}}>
                     <Text style={styles.cityText} numberOfLines={1}>{ticket.origin}</Text>
                     <Text style={styles.timeText}>{ticket.depTime} น.</Text>
                  </View>

                  <View style={styles.arrowContainer}>
                    <Text style={styles.durationText}>{ticket.duration}</Text>
                    <View style={styles.lineArrowWrapper}>
                      <View style={styles.lineArrow} />
                      <Ionicons name="caret-forward" size={14} color="#BDBDBD" style={styles.lineArrowHead} />
                    </View>
                  </View>

                  <View style={{flex: 1, alignItems: 'flex-end'}}>
                     <Text style={styles.cityText} numberOfLines={1}>{ticket.dest}</Text>
                     <Text style={styles.timeText}>{ticket.arrTime} น.</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.mapBtn} onPress={() => openMapModal(ticket)}>
                  <Ionicons name="location" size={16} color="#FFF" /><Text style={styles.mapBtnText}> ติดตามขบวนรถ</Text>
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
                  <Text style={styles.modalHeaderTitleCenter}>Tracking System</Text>
                  <View style={{width: 40}} />
                </View>
                <View style={styles.stationProgressRow}>
                  <View style={styles.progressDotSmall} /><View style={styles.progressLine} />
                  <View style={styles.progressDotActive}><View style={styles.progressDotInner} /></View>
                  <View style={styles.progressLine} /><View style={styles.progressDotSmall} />
                </View>
                <View style={styles.stationNameRow}>
                  <Text style={styles.stationNameLabel} numberOfLines={1}>{demoState.currentStation}</Text>
                  <Text style={styles.stationNameLabelMain}>กำลังมุ่งหน้าไป</Text>
                  <Text style={styles.stationNameLabel} numberOfLines={1}>{demoState.nextStation}</Text>
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
              {activeMapTicket && activeMapTicket.routeCoords.length > 0 && (
                <Polyline coordinates={activeMapTicket.routeCoords} strokeWidth={5} strokeColor="#5E35B1" />
              )}
              {activeMapTicket && <Marker coordinate={activeMapTicket.originCoords} title={activeMapTicket.origin} pinColor="red" />}
              {activeMapTicket && <Marker coordinate={activeMapTicket.destCoords} title={activeMapTicket.dest} pinColor="blue" />}
              
              {demoState.coord && (
                <Marker coordinate={demoState.coord} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.trainMarkerBox}>
                    <Ionicons name="train" size={20} color="#FFF" />
                  </View>
                </Marker>
              )}
            </MapView>

            <TouchableOpacity style={[styles.demoFloatingBtn, isDemoRunning && {backgroundColor: '#9E9E9E'}]} onPress={startDemoJourney} disabled={isDemoRunning}>
              <Ionicons name={isDemoRunning ? "train" : "play"} size={20} color="#FFF" />
              <Text style={styles.demoFloatingBtnText}>{isDemoRunning ? 'กำลังเดินทาง...' : 'จำลองการเดินทาง'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapBottomCard}>
             <View style={styles.mapRouteInfoRow}>
                <View style={styles.mapInfoBox}>
                   <Text style={styles.mapLabelSub}>สถานีต้นทาง</Text>
                   <Text style={styles.mapLabelMain}>{activeMapTicket?.origin}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#757575" />
                <View style={styles.mapInfoBox}>
                   <Text style={styles.mapLabelSub}>สถานีปลายทาง</Text>
                   <Text style={styles.mapLabelMain}>{activeMapTicket?.dest}</Text>
                </View>
             </View>
             <View style={styles.mapStatsRow}>
                <View style={styles.mapStatItem}>
                   <Text style={styles.mapLabelSub}>เวลาถึงจุดหมาย</Text>
                   <Text style={styles.mapStatValue}>{formatRemainingTime(demoState.remainingMins)}</Text>
                </View>
                <View style={styles.mapStatItem}>
                   <Text style={styles.mapLabelSub}>สถานะขบวนรถ</Text>
                   {isDemoRunning ? (
                      <Text style={[styles.mapStatValue, {color: '#FF5252'}]}>ล่าช้า {demoState.delayMins} นาที</Text>
                   ) : (
                      <Text style={[styles.mapStatValue, {color: '#4CAF50'}]}>ปกติ</Text>
                   )}
                </View>
             </View>
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
             </SafeAreaView>
          </View>
          <View style={styles.alertCardContainer}>
             <View style={styles.alertDarkCard}>
                <View style={styles.alertIconWrapper}><Ionicons name="alarm-outline" size={80} color="#FFF" /></View>
                <Text style={styles.alertWarningTitle}>เตรียมตัวลงจากขบวนรถ!</Text>
                <Text style={styles.alertWarningSub}>รถไฟกำลังจะเข้าสู่สถานีปลายทาง</Text>
                
                <View style={styles.alertNextStationBox}>
                   <View style={styles.alertNextIcon}><Ionicons name="train" size={24} color="#5E35B1" /></View>
                   <View style={{flex: 1}}>
                      <Text style={styles.alertLabelGrey}>สถานีปลายทาง</Text>
                      <Text style={styles.alertStationBig} numberOfLines={1}>{activeAlertTicket?.dest}</Text>
                   </View>
                </View>

                <TouchableOpacity style={styles.alertMapBtn} onPress={() => { setActiveAlertTicket(null); Vibration.cancel(); }}>
                  <Text style={styles.alertMapBtnText}>ตกลง / ปิดเสียงเตือน</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomTabContainer}>
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/')}>
            <Ionicons name={pathname === '/' ? "home" : "home-outline"} size={24} color={pathname === '/' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/' && styles.tabItemTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/location')}>
            <Ionicons name={pathname === '/location' ? "location" : "location-outline"} size={24} color={pathname === '/location' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/location' && styles.tabItemTextActive]}>Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/notifications')}>
            <Ionicons name={pathname === '/notifications' ? "notifications" : "notifications-outline"} size={24} color={pathname === '/notifications' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/notifications' && styles.tabItemTextActive]}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/profile')}>
            <Ionicons name={pathname === '/profile' ? "person-circle" : "person-circle-outline"} size={24} color={pathname === '/profile' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/profile' && styles.tabItemTextActive]}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// 🛡️ Styles 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  safeArea: { flex: 1, zIndex: 1 },
  blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: '#2E3165', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, zIndex: 0 },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingRight: 15, borderRadius: 20 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  scrollContent: { padding: 20, paddingTop: 30, paddingBottom: 120 },
  
  locationCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 15, elevation: 2, padding: 20, paddingBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  dateBadgeText: { color: '#5E35B1', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cityText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 12, color: '#757575', marginTop: 4, fontWeight: '500' },
  
  arrowContainer: { alignItems: 'center', flex: 1, marginHorizontal: 15 },
  durationText: { fontSize: 10, color: '#9E9E9E', marginBottom: 6, fontWeight: 'bold' },
  lineArrowWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  lineArrow: { flex: 1, height: 1, backgroundColor: '#E0E0E0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 1 },
  lineArrowHead: { marginLeft: -4 },

  mapBtn: { backgroundColor: '#5E35B1', alignSelf: 'center', paddingHorizontal: 25, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  mapBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  
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
  stationNameLabel: { color: '#D1C4E9', fontSize: 10, maxWidth: 90, textAlign: 'center' },
  stationNameLabelMain: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  
  mapBottomCard: { backgroundColor: '#1E2046', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  mapRouteInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#3A3C59', paddingBottom: 20, marginBottom: 20 },
  mapInfoBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15, backgroundColor: '#262956' },
  mapLabelSub: { color: '#A8AACC', fontSize: 10, marginBottom: 4 },
  mapLabelMain: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  mapStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mapStatItem: { flex: 1, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15, paddingVertical: 12, alignItems: 'center', marginHorizontal: 5, backgroundColor: '#262956' },
  mapStatValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  
  alertCardContainer: { flex: 1, padding: 20, marginTop: 10, justifyContent: 'center' },
  alertDarkCard: { backgroundColor: '#1E2046', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 10 },
  alertIconWrapper: { marginTop: 10, marginBottom: 20 },
  alertWarningTitle: { color: '#FF5252', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  alertWarningSub: { color: '#A8AACC', fontSize: 14, textAlign: 'center', marginBottom: 30 },
  alertNextStationBox: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 20, marginBottom: 30, backgroundColor: '#262956' },
  alertNextIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(94,53,177,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertLabelGrey: { color: '#A8AACC', fontSize: 12, marginBottom: 4 },
  alertStationBig: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  alertMapBtn: { width: '100%', backgroundColor: '#5E35B1', borderRadius: 20, justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  alertMapBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  demoFloatingBtn: { position: 'absolute', top: 20, left: 20, backgroundColor: '#FF7043', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  demoFloatingBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  trainMarkerBox: { backgroundColor: '#5E35B1', padding: 10, borderRadius: 25, borderWidth: 3, borderColor: '#FFF', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }
});
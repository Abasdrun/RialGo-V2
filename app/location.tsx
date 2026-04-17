import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'; 
import * as Location from 'expo-location'; 
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

// โครงสร้างข้อมูลตั๋ว
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
  originCoords: { latitude: number, longitude: number }; // 📍 พิกัดต้นทาง
  destCoords: { latitude: number, longitude: number };   // 📍 พิกัดปลายทาง
}

export default function LocationScreen() {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [userInitial, setUserInitial] = useState('อ'); // 🚀 เอากลับมาแล้ว!

  const [activeMapTicket, setActiveMapTicket] = useState<Ticket | null>(null);
  const [activeAlertTicket, setActiveAlertTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchActiveTickets();
    requestLocationPermission();
  }, []);

  // ไม่ดัก Error ตามที่สั่ง ปล่อยแดงถ้าไม่เปิด GPS
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
        setUserInitial(user.user_metadata?.full_name?.charAt(0).toUpperCase() || 'อ');

        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id, status, selected_seats, created_at, origin_station_id, destination_station_id,
            trips ( train_id, departure_date, trains ( type, train_number ) ),
            origin:origin_station_id ( station_name, latitude, longitude ), 
            dest:destination_station_id ( station_name, latitude, longitude )
          `)
          .eq('user_id', user.id)
          .eq('status', 'Confirmed') 
          .order('created_at', { ascending: false });

        if (bookings && bookings.length > 0) {
          const formattedTickets = await Promise.all(bookings.map(async (b: any) => {
            let exactDep = '18:30'; 
            let exactArr = '01:00';
            
            if (b.trips?.train_id && b.origin_station_id && b.destination_station_id) {
               const { data: stops } = await supabase.from('train_stops')
                  .select('station_id, departure_time, arrival_time')
                  .eq('train_id', b.trips.train_id)
                  .in('station_id', [b.origin_station_id, b.destination_station_id]);
               
               if (stops) {
                  const originStop = stops.find(s => s.station_id === b.origin_station_id);
                  const destStop = stops.find(s => s.station_id === b.destination_station_id);
                  if (originStop?.departure_time) exactDep = originStop.departure_time.substring(0, 5);
                  if (destStop?.arrival_time) exactArr = destStop.arrival_time.substring(0, 5);
               }
            }

            const depDateStr = b.trips?.departure_date || new Date().toISOString().split('T')[0];
            const depDateTime = new Date(`${depDateStr}T${exactDep}:00`);
            const arrDateTime = new Date(depDateTime);
            const [dh, dm] = exactDep.split(':').map(Number);
            const [ah, am] = exactArr.split(':').map(Number);
            let durationMins = (ah * 60 + am) - (dh * 60 + dm);
            if (durationMins < 0) durationMins += 24 * 60; 
            arrDateTime.setMinutes(arrDateTime.getMinutes() + durationMins);

            if (new Date() > arrDateTime) {
              return null; 
            }

            const { cabin, seats, count } = parseCabinAndSeats(b.selected_seats);
            const durationTxt = calculateRealDuration(exactDep, exactArr);

            return {
              id: b.id.toString(),
              refCode: `TH ${new Date(b.created_at).getFullYear()}-${String(b.id).padStart(5, '0')}`,
              trainName: `${b.trips?.trains?.type || 'ด่วนพิเศษ'} ${b.trips?.trains?.train_number || '7'}`,
              origin: b.origin?.station_name || 'ดอนเมือง',
              dest: b.dest?.station_name || 'รังสิต',
              depTime: exactDep,
              arrTime: exactArr,
              duration: durationTxt,
              date: b.trips?.departure_date,
              seat: seats,
              cabin: cabin,
              pax: count,
              classType: b.trips?.trains?.type === 'รถด่วนพิเศษ' ? 'ชั้น 2' : 'ชั้น 3',
              // 🚀 ดึงพิกัดจากฐานข้อมูล (ถ้าไม่มีให้ Default เป็นแถวดอนเมือง/รังสิต)
              originCoords: { 
                latitude: parseFloat(b.origin?.latitude) || 13.9235, 
                longitude: parseFloat(b.origin?.longitude) || 100.6042 
              },
              destCoords: { 
                latitude: parseFloat(b.dest?.latitude) || 13.9858, 
                longitude: parseFloat(b.dest?.longitude) || 100.6066 
              }
            };
          }));

          setTickets(formattedTickets.filter(t => t !== null) as Ticket[]);
        } else {
           setTickets([]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (tab: string) => {
    if (tab === 'home') router.push('/');
    if (tab === 'profile') router.push('/profile'); 
    if (tab === 'notifications') router.push('/notifications');
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Location</Text>
          </TouchableOpacity>
          {/* 🚀 เอาปุ่มโปรไฟล์ตัวอักษรกลับมาให้แล้ว! */}
          <TouchableOpacity style={styles.profileBtnCircle}>
            <Text style={styles.profileBtnText}>{userInitial}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {tickets.map((ticket, index) => (
              <View key={index} style={styles.locationCard}>
                
                <View style={styles.routeRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cityText}>{ticket.origin}</Text>
                    <Text style={styles.timeText}>{ticket.depTime}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Text style={styles.durationText}>{ticket.duration}</Text>
                    <Ionicons name="caret-forward" size={16} color="#BDBDBD" style={{marginTop: -8}} />
                  </View>
                  <View style={{flex: 1, alignItems: 'flex-end'}}>
                    <Text style={styles.cityText}>{ticket.dest}</Text>
                    <Text style={styles.timeText}>{ticket.arrTime}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}><Ionicons name="alarm-outline" size={12} color="#9E9E9E" /><Text style={styles.infoText}> {ticket.trainName}</Text></View>
                  <View style={styles.infoItem}><MaterialCommunityIcons name="seat-passenger" size={12} color="#9E9E9E" /><Text style={styles.infoText}> {ticket.classType} · ที่นั่ง {ticket.seat} · ตู้ {ticket.cabin}</Text></View>
                  <View style={styles.infoItem}><Ionicons name="body-outline" size={12} color="#9E9E9E" /><Text style={styles.infoText}> {ticket.pax} คน</Text></View>
                </View>

                <TouchableOpacity style={styles.mapBtn} onPress={() => setActiveMapTicket(ticket)}>
                  <Ionicons name="map-outline" size={16} color="#262956" />
                  <Text style={styles.mapBtnText}> แผนที่เดินทาง</Text>
                </TouchableOpacity>

              </View>
            ))}

            {tickets.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={50} color="#BDBDBD" />
                <Text style={styles.emptyText}>ไม่มีการเดินทางในขณะนี้</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('home')}>
          <Ionicons name="home-outline" size={24} color="#757575" />
          <Text style={styles.tabItemText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItemActive}>
          <Ionicons name="location" size={26} color="#5E35B1" />
          <Text style={styles.tabItemTextActive}>Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#757575" />
          <Text style={styles.tabItemText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('profile')}>
          <Ionicons name="person-outline" size={24} color="#757575" />
          <Text style={styles.tabItemText}>My Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* 🗺️ MODAL: แผนที่เดินทาง (Map View) */}
      {/* ========================================================= */}
      <Modal visible={!!activeMapTicket} animationType="slide" transparent>
        <View style={styles.modalFullBgWhite}>
          
          <View style={styles.mapHeaderBg}>
             <SafeAreaView edges={['top']}>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setActiveMapTicket(null)} style={styles.backBtnCircle}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>Location</Text>
                  <View style={{width: 40}} />
                </View>

                <View style={styles.stationProgressRow}>
                  <View style={styles.progressDotSmall} />
                  <View style={styles.progressLine} />
                  <View style={styles.progressDotActive}>
                     <View style={styles.progressDotInner} />
                  </View>
                  <View style={styles.progressLine} />
                  <View style={styles.progressDotSmall} />
                </View>
                <View style={styles.stationNameRow}>
                  <Text style={styles.stationNameLabel}>สถานีศาลายา</Text>
                  <Text style={styles.stationNameLabel}>สถานีนครปฐม</Text>
                  <Text style={styles.stationNameLabel}>สถานีบ้านโป่ง</Text>
                </View>
             </SafeAreaView>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: activeMapTicket?.originCoords?.latitude || location?.latitude || 13.9235,
                longitude: activeMapTicket?.originCoords?.longitude || location?.longitude || 100.6042,
                latitudeDelta: 0.1, // ซูมใกล้ขึ้นหน่อยจะได้เห็นชัดๆ
                longitudeDelta: 0.1,
              }}
              showsUserLocation={true}
              customMapStyle={mapStyle} 
            >
              {/* 🚀 ลากเส้นตามพิกัดจริงที่ได้จาก Database! */}
              {activeMapTicket && activeMapTicket.originCoords && activeMapTicket.destCoords && (
                <Polyline 
                  coordinates={[ activeMapTicket.originCoords, activeMapTicket.destCoords ]} 
                  strokeColor="#5E35B1" strokeWidth={4} 
                />
              )}
            </MapView>
          </View>

          <View style={styles.mapBottomCard}>
             <View style={styles.mapRouteInfoRow}>
                <View style={styles.mapInfoBox}>
                   <Text style={styles.mapLabelSub}>สถานีต้นทาง</Text>
                   <Text style={styles.mapLabelMain}>{activeMapTicket?.origin}</Text>
                   <Text style={styles.mapLabelSub}>{activeMapTicket?.depTime}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#757575" />
                <View style={styles.mapInfoBox}>
                   <Text style={styles.mapLabelSub}>สถานีปลายทาง</Text>
                   <Text style={styles.mapLabelMain}>{activeMapTicket?.dest}</Text>
                   <Text style={styles.mapLabelSub}>{activeMapTicket?.arrTime}</Text>
                </View>
             </View>

             <View style={styles.mapStatsRow}>
                <View style={styles.mapStatItem}>
                   <Text style={styles.mapLabelSub}>สถานีถัดไป</Text>
                   <Text style={styles.mapStatValue}>สถานีบ้านโป่ง</Text>
                </View>
                <View style={styles.mapStatItem}>
                   <Text style={styles.mapLabelSub}>ระยะทาง</Text>
                   <Text style={styles.mapStatValue}>320 km</Text>
                </View>
                <View style={styles.mapStatItem}>
                   <Text style={styles.mapLabelSub}>คงเหลือ</Text>
                   <Text style={styles.mapStatValue}>3:22 ชั่วโมง</Text>
                </View>
             </View>
             
             <TouchableOpacity style={{position: 'absolute', top: 10, right: 10, padding: 10}} onPress={() => {
                setActiveAlertTicket(activeMapTicket);
                setActiveMapTicket(null);
             }}>
                 <Ionicons name="notifications-circle" size={30} color="#FFF" />
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* ⏰ MODAL: แจ้งเตือนก่อนถึงสถานี (Alert View) */}
      {/* ========================================================= */}
      <Modal visible={!!activeAlertTicket} animationType="slide" transparent>
        <View style={styles.modalFullBgWhite}>
          
          <View style={styles.mapHeaderBg}>
             <SafeAreaView edges={['top']}>
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setActiveAlertTicket(null)} style={styles.backBtnCircle}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>แจ้งเตือนสถานี</Text>
                  <View style={{width: 40}} />
                </View>

                <View style={styles.stationProgressRow}>
                  <View style={styles.progressDotSmall} />
                  <View style={styles.progressLine} />
                  <View style={styles.progressDotActive}>
                     <View style={styles.progressDotInner} />
                  </View>
                  <View style={styles.progressLine} />
                  <View style={styles.progressDotSmall} />
                </View>
                <View style={styles.stationNameRow}>
                  <Text style={styles.stationNameLabel}>สถานีศาลายา</Text>
                  <Text style={styles.stationNameLabel}>สถานีนครปฐม</Text>
                  <Text style={styles.stationNameLabel}>สถานีบ้านโป่ง</Text>
                </View>
             </SafeAreaView>
          </View>

          <View style={styles.alertCardContainer}>
             <View style={styles.alertDarkCard}>
                
                <View style={styles.alertIconWrapper}>
                   <Ionicons name="alarm-outline" size={80} color="#FFF" />
                </View>
                <Text style={styles.alertHugeTime}>20</Text>
                <Text style={styles.alertMinText}>นาที</Text>

                <View style={styles.alertWarningBox}>
                   <Text style={styles.alertWarningTitle}>อีก 20 นาที จะถึงสถานีปลายทาง</Text>
                   <Text style={styles.alertWarningSub}>กรุณาเตรียมสัมภาระและบัตรโดยสาร</Text>
                </View>

                <View style={styles.alertNextStationBox}>
                   <View style={styles.alertNextIcon}><Ionicons name="train" size={24} color="#5E35B1" /></View>
                   <View style={{flex: 1}}>
                      <Text style={styles.alertLabelGrey}>สถานีถัดไป (ปลายทาง)</Text>
                      <Text style={styles.alertStationBig}>{activeAlertTicket?.dest}</Text>
                      <Text style={styles.alertLabelGrey}>{activeAlertTicket?.arrTime}</Text>
                   </View>
                   <View style={{alignItems: 'flex-end'}}>
                      <Text style={styles.alertYellowText}>อีก 20 นาที</Text>
                      <Text style={styles.alertLabelGrey}>ชานชาลา 2</Text>
                   </View>
                </View>

                <View style={styles.alertActionRow}>
                   <View style={styles.alertSeatBox}>
                      <Text style={styles.alertGreenText}>ที่นั่งของคุณ</Text>
                      <Text style={styles.alertSeatTextMain}>ที่นั่ง {activeAlertTicket?.seat} · ตู้ {activeAlertTicket?.cabin} · {activeAlertTicket?.classType}</Text>
                      <View style={styles.alertSeatBadge}><Text style={styles.alertSeatBadgeText}>{activeAlertTicket?.seat}</Text></View>
                   </View>

                   <TouchableOpacity style={styles.alertMapBtn} onPress={() => {
                      setActiveMapTicket(activeAlertTicket);
                      setActiveAlertTicket(null);
                   }}>
                      <Ionicons name="map-outline" size={20} color="#FFF" style={{marginRight: 5}} />
                      <Text style={styles.alertMapBtnText}>ดูแผนที่</Text>
                   </TouchableOpacity>
                </View>

             </View>
          </View>

        </View>
      </Modal>

    </View>
  );
}

const mapStyle = [];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  safeArea: { flex: 1, zIndex: 10 },
  
  blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: '#2E3165', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, zIndex: 0 },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingRight: 15, borderRadius: 20 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  profileBtnCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  profileBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingTop: 30, paddingBottom: 120 },
  
  locationCard: { backgroundColor: '#FFFDFD', borderRadius: 25, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, padding: 20, paddingBottom: 0 },
  
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

  bottomTabBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 15 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabItemActive: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabItemText: { fontSize: 10, color: '#757575', marginTop: 4, fontWeight: '500' },
  tabItemTextActive: { fontSize: 10, color: '#5E35B1', marginTop: 4, fontWeight: 'bold' },

  modalFullBgWhite: { flex: 1, backgroundColor: '#F9F9F9' }, 
  mapHeaderBg: { backgroundColor: '#2E3165', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 20 },
  
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  modalHeaderTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  stationProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginBottom: 10 },
  progressDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EBE4FF' },
  progressDotActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  progressDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#FFF', marginHorizontal: -2 },
  stationNameRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30 },
  stationNameLabel: { color: '#D1C4E9', fontSize: 10 },

  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(244, 67, 54, 0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F44336' },
  markerCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F44336' },

  mapBottomCard: { backgroundColor: '#1E2046', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, marginTop: -20 },
  mapRouteInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#3A3C59', paddingBottom: 20, marginBottom: 20 },
  mapInfoBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15 },
  mapLabelSub: { color: '#A8AACC', fontSize: 10, marginBottom: 2 },
  mapLabelMain: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  mapStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mapStatItem: { flex: 1, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 15, paddingVertical: 10, paddingHorizontal: 10, marginRight: 5, alignItems: 'center' },
  mapStatValue: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 2 },

  alertCardContainer: { flex: 1, padding: 20, marginTop: 10 },
  alertDarkCard: { backgroundColor: '#1E2046', borderRadius: 30, padding: 25, flex: 1, alignItems: 'center', elevation: 5 },
  alertIconWrapper: { marginTop: 10, marginBottom: 10 },
  alertHugeTime: { fontSize: 70, fontWeight: 'bold', color: '#FFF', lineHeight: 80 },
  alertMinText: { fontSize: 18, color: '#FFF', marginBottom: 20 },

  alertWarningBox: { width: '100%', borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, alignItems: 'center', marginBottom: 20 },
  alertWarningTitle: { color: '#F44336', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  alertWarningSub: { color: '#A8AACC', fontSize: 10 },

  alertNextStationBox: { width: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, marginBottom: 20 },
  alertNextIcon: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(94,53,177,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertLabelGrey: { color: '#A8AACC', fontSize: 10 },
  alertStationBig: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginVertical: 2 },
  alertYellowText: { color: '#FBC02D', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },

  alertActionRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  alertSeatBox: { flex: 1, borderWidth: 1, borderColor: '#3A3C59', borderRadius: 20, padding: 15, marginRight: 10 },
  alertGreenText: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  alertSeatTextMain: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  alertSeatBadge: { backgroundColor: '#5E35B1', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  alertSeatBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  alertMapBtn: { flex: 0.8, backgroundColor: '#3A3C59', borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#5E35B1' },
  alertMapBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});
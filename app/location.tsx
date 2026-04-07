import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Modal, Animated, PanResponder, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

// 🌍 นำเข้าไลบรารีแผนที่และ GPS ของจริง!
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function LocationScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States แผนที่และพิกัด
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showAlarm, setShowAlarm] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [distanceToDest, setDistanceToDest] = useState<number | null>(null); // ระยะทางที่เหลือ (km)
  
  // ตัวแปรเก็บฟังก์ชันติดตาม GPS เพื่อให้กดยกเลิกได้ตอนปิดแผนที่
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    fetchAllTrips();
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  // 📥 1. ดึงข้อมูลตั๋ว พร้อมพิกัด Latitude, Longitude จาก DB
  const fetchAllTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id, 
          origin:origin_station_id(station_name, latitude, longitude), 
          destination:destination_station_id(station_name, latitude, longitude), 
          status
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const formatted = data.map(b => ({
          id: b.id,
          origin: b.origin?.station_name || 'สถานีกลางกรุงเทพอภิวัฒน์',
          originCoords: { lat: b.origin?.latitude || 13.8045, lon: b.origin?.longitude || 100.5398 },
          destination: b.destination?.station_name || 'สถานีชุมพร',
          destCoords: { lat: b.destination?.latitude || 10.4955, lon: b.destination?.longitude || 99.1821 },
          depTime: '06:00', 
          arrTime: '12:30', 
        }));
        setTickets(formatted);
      }
    }
    setLoading(false);
  };

  // 🧮 ฟังก์ชันคำนวณระยะทาง (Haversine formula) หาระยะห่างเป็นกิโลเมตร
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ⏱️ ✅ ใหม่! ฟังก์ชันแปลงระยะทาง (กม.) เป็นเวลาที่เหลือ (ชม. นาที)
  const calculateTimeRemaining = (dist: number) => {
    const avgSpeed = 60; // ความเร็วเฉลี่ยรถไฟ (กม./ชม.)
    const totalHours = dist / avgSpeed;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);

    if (h > 0) return `อีก ${h} ชั่วโมง ${m} นาที`;
    if (m > 0) return `อีก ${m} นาที`;
    return 'กำลังจะถึงสถานี!';
  };

  // 🛰️ 2. ระบบขอสิทธิ์ GPS และติดตามพิกัด Real-time
  const startTrackingLocation = async (trip: any) => {
    setSelectedTrip(trip);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'ต้องอนุญาตให้เข้าถึง GPS ถึงจะดูแผนที่ได้นะพี่ยอน!');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const currentCoords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setCurrentLocation(currentCoords);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const coords = { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude };
          setCurrentLocation(coords);

          const dist = calculateDistance(coords.latitude, coords.longitude, trip.destCoords.lat, trip.destCoords.lon);
          setDistanceToDest(dist);

          if (dist < 20 && !showAlarm) {
            setShowAlarm(true);
          }
        }
      );
    } catch (error) {
      Alert.alert('GPS Error 🛰️', 'หาตำแหน่งไม่เจอ! รบกวนพี่ยอนเปิด Location ใน Emulator ด้วยครับผม หรือลอง Set Location ในเมนู ... ดูนะ');
      setCurrentLocation({ latitude: 13.7563, longitude: 100.5018 }); 
    }
  };

  const closeMap = () => {
    if (locationSubscription.current) locationSubscription.current.remove();
    setSelectedTrip(null);
    setCurrentLocation(null);
    setDistanceToDest(null);
  };

  // 🎚️ 3. ระบบ Slider สำหรับหน้า Alarm
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > 150) {
          setShowAlarm(false);
          closeMap(); 
          pan.setValue({ x: 0, y: 0 }); 
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const renderTripCard = ({ item }: { item: any }) => (
    <View style={styles.tripCard}>
      <View style={styles.routeHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="train" size={20} color="#5E35B1" />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.routeTitle}>{item.origin}</Text>
          <Ionicons name="arrow-down" size={12} color="#9E9E9E" style={{ marginLeft: 5, marginVertical: 2 }} />
          <Text style={styles.routeTitle}>{item.destination}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.trackBtn}
        onPress={() => startTrackingLocation(item)}
      >
        <Ionicons name="map-outline" size={20} color="#FFF" />
        <Text style={styles.trackBtnText}>เข้าสู่แผนที่นำทาง</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Ionicons name="location-outline" size={20} color="#333" />
          <Text style={styles.titleText}>Location</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <Text style={styles.pageSubtitle}>รายการเที่ยวรถทั้งหมดของคุณ</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderTripCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>คุณยังไม่มีประวัติการจองเที่ยวรถเลย</Text>
            </View>
          }
        />
      )}

      {/* ======================================= */}
      {/* 🗺️ MODAL 1: หน้าแผนที่จริง */}
      {/* ======================================= */}
      <Modal visible={!!selectedTrip && !showAlarm} animationType="fade">
        <View style={styles.mapContainer}>
          
          {currentLocation && selectedTrip && (
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 2.0,
                longitudeDelta: 2.0,
              }}
              showsUserLocation={true}
            >
              <Marker 
                coordinate={{ latitude: selectedTrip.destCoords.lat, longitude: selectedTrip.destCoords.lon }}
                title={selectedTrip.destination}
                pinColor="#E91E63"
              />
              <Polyline 
                coordinates={[
                  currentLocation,
                  { latitude: selectedTrip.destCoords.lat, longitude: selectedTrip.destCoords.lon }
                ]}
                strokeColor="#5E35B1"
                strokeWidth={4}
              />
            </MapView>
          )}
          
          <SafeAreaView style={{flex: 1, pointerEvents: 'box-none'}}>
            <View style={styles.mapHeaderRow}>
              <TouchableOpacity onPress={closeMap} style={styles.mapBackBtn}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.mapTitleBox}>
                <Ionicons name="location" size={16} color="#333" />
                <Text style={styles.mapTitleText}>Live Tracking</Text>
              </View>
            </View>

            <View style={styles.floatingCard}>
              <View style={styles.trackingTimeline}>
                <View style={styles.trackDotBlack} />
                <View style={styles.trackLineHalfBlack} />
                <Ionicons name="train" size={20} color="#E91E63" style={{marginHorizontal: -5}} />
                <View style={styles.trackLineHalfGrey} />
                <View style={styles.trackDotOutline} />
              </View>
              <View style={styles.trackStationLabels}>
                <Text style={[styles.trackStationText, {textAlign: 'left'}]}>ตำแหน่งของคุณ</Text>
                <Text style={[styles.trackStationText, {textAlign: 'right'}]}>{selectedTrip?.destination}</Text>
              </View>

              {/* ✅ แก้ไขตรงนี้แหละอาจารย์! โชว์เป็นเวลาที่คำนวณมาอย่างหล่อ */}
              <TouchableOpacity onPress={() => setShowAlarm(true)} style={{alignItems: 'center'}}>
                <Text style={styles.timeRemainText}>
                  {distanceToDest ? calculateTimeRemaining(distanceToDest) : 'กำลังคำนวณ...'}
                </Text>
                {distanceToDest && (
                  <Text style={{fontSize: 12, color: '#9E9E9E', marginTop: 2, marginBottom: 10}}>
                    (ระยะทาง {distanceToDest.toFixed(1)} กม.)
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.alarmInfoBox}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="alarm-outline" size={20} color="#333" />
                  <View style={{marginLeft: 10}}>
                    <Text style={styles.alarmBoxTitle}>ระบบปลุกอัตโนมัติทำงาน</Text>
                    <Text style={styles.alarmBoxSub}>จะปลุกเมื่อเข้าใกล้ 20 กม. สุดท้าย</Text>
                  </View>
                </View>
                <Ionicons name="radio-button-on" size={16} color="#4CAF50" />
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ======================================= */}
      {/* ⏰ MODAL 2: หน้าแจ้งเตือนก่อนลงรถ */}
      {/* ======================================= */}
      <Modal visible={showAlarm} animationType="slide">
        <SafeAreaView style={styles.alarmContainer}>
          <View style={styles.alarmHeaderRow}>
            <TouchableOpacity onPress={() => {setShowAlarm(false); closeMap();}} style={styles.alarmBackBtn}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.alarmTitleBox}>
              <Ionicons name="location" size={16} color="#333" />
              <Text style={styles.alarmTitleText}>Arrival Alert</Text>
            </View>
          </View>

          <View style={styles.warningTextContainer}>
            <Text style={styles.warningRedHuge}>ใกล้ถึงแล้ว!</Text>
            <Text style={styles.warningRedNormal}>เตรียมตัวลงที่สถานี {selectedTrip?.destination}</Text>
          </View>

          <View style={styles.bigAlarmCircle}>
            <Ionicons name="alarm" size={120} color="#FFF" />
          </View>

          <View style={styles.sliderTrack}>
            <Animated.View
              style={[styles.sliderThumb, { transform: [{ translateX: pan.x }] }]}
              {...panResponder.panHandlers}
            >
              <Ionicons name="caret-forward" size={24} color="#333" />
            </Animated.View>
            <Text style={styles.sliderText}>เลื่อนเพื่อปิดการแจ้งเตือน</Text>
          </View>

        </SafeAreaView>
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
  pageSubtitle: { marginHorizontal: 25, fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  tripCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F2FF', justifyContent: 'center', alignItems: 'center' },
  routeTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  trackBtn: { backgroundColor: '#5E35B1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 15 },
  trackBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 16 },

  mapContainer: { flex: 1, backgroundColor: '#E0E0E0' },
  mapHeaderRow: { flexDirection: 'row', padding: 20, alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  mapBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  mapTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginLeft: 15, paddingHorizontal: 15, elevation: 5 },
  mapTitleText: { marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#333' },

  floatingCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 25, padding: 20, elevation: 10 },
  trackingTimeline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  trackDotBlack: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#333' },
  trackLineHalfBlack: { flex: 1, height: 2, backgroundColor: '#333' },
  trackLineHalfGrey: { flex: 1, height: 2, backgroundColor: '#E0E0E0' },
  trackDotOutline: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#333', backgroundColor: '#FFF' },
  trackStationLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  trackStationText: { fontSize: 12, color: '#757575', fontWeight: 'bold' },
  
  // ปรับตัวหนังสือสีเขียวให้เด่นขึ้น
  timeRemainText: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center' },
  delayText: { fontSize: 12, color: '#9E9E9E', marginTop: 5, marginBottom: 15, textAlign: 'center' },

  alarmInfoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 15, padding: 15 },
  alarmBoxTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  alarmBoxSub: { fontSize: 10, color: '#9E9E9E', marginTop: 2 },

  alarmContainer: { flex: 1, backgroundColor: '#0B0C1A' },
  alarmHeaderRow: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  alarmBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  alarmTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginLeft: 15, paddingHorizontal: 15 },
  alarmTitleText: { marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#333' },

  warningTextContainer: { alignItems: 'center', marginTop: 80 },
  warningRedHuge: { color: '#E91E63', fontSize: 36, fontWeight: 'bold' },
  warningRedNormal: { color: '#FFF', fontSize: 18, marginTop: 10 },
  bigAlarmCircle: { alignSelf: 'center', marginTop: 80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#E91E63', shadowOpacity: 0.5, shadowRadius: 20 },

  sliderTrack: { position: 'absolute', bottom: 50, alignSelf: 'center', width: width - 60, height: 60, backgroundColor: '#FFF', borderRadius: 30, justifyContent: 'center', paddingHorizontal: 5 },
  sliderThumb: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', zIndex: 1, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  sliderText: { position: 'absolute', width: '100%', textAlign: 'center', color: '#757575', fontSize: 14, fontWeight: 'bold', zIndex: 0 },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../supabase';

export default function BookTicketScreen() {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [origin, setOrigin] = useState('เลือกสถานีต้นทาง');
  const [destination, setDestination] = useState('เลือกสถานีปลายทาง');
  const [departureDate, setDepartureDate] = useState('เลือกวันเดินทาง');
  const [returnDate, setReturnDate] = useState('เลือกวันกลับ');
  
  // 📌 คง State ผู้โดยสารไว้เหมือนเดิม
  const [passengers, setPassengers] = useState({ adult: 1, child: 0, infant: 0 });

  const [trainType, setTrainType] = useState('รถด่วนพิเศษ');
  const [cabinClass, setCabinClass] = useState('ตู้นอนปรับอากาศ ชั้น 2');
  const [cabinNumber, setCabinNumber] = useState('1');

  const [stations, setStations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStations, setLoadingStations] = useState(false);
  const [selectingType, setSelectingType] = useState<'origin' | 'destination'>('origin');

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // 📅 States สำหรับตัวปฏิทินแบบใหม่ (เก็บระยะห่างเดือน)
  const [depMonthOffset, setDepMonthOffset] = useState(0);
  const [retMonthOffset, setRetMonthOffset] = useState(0);

  useEffect(() => {
    fetchStations();
  }, []);

  // 🛡️ ฟังก์ชันเงื่อนไขต่างๆ อยู่ครบ ไม่มีการดัดแปลง!
  const fetchStations = async () => {
    setLoadingStations(true);
    const { data } = await supabase.from('stations').select('*').order('km', { ascending: true });
    if (data) setStations(data);
    setLoadingStations(false);
  };

  const getCabinOptions = () => {
    return trainType === 'รถด่วนพิเศษ' 
      ? ['ตู้นอนปรับอากาศ ชั้น 2', 'ตู้นอนปรับอากาศ ชั้น 2 สำหรับผู้พิการ/วีลแชร์', 'ตู้นอนปรับอากาศ ชั้น 1']
      : ['ตู้นั่งพัดลม ชั้น 3', 'ตู้นั่งปรับอากาศ / พัดลม ชั้น 2', 'ตู้นอนปรับอากาศ ชั้น 2'];
  };

  const getNumberOptions = () => {
    if (trainType === 'รถด่วนพิเศษ') {
      if (cabinClass === 'ตู้นอนปรับอากาศ ชั้น 2') return [1, 2, 3, 4, 5, 7, 8, 9, 10];
      if (cabinClass.includes('วีลแชร์')) return [6];
      return [11];
    } else {
      if (cabinClass === 'ตู้นั่งพัดลม ชั้น 3') return [5, 6, 7, 8, 9, 10, 11];
      if (cabinClass.includes('นั่งปรับอากาศ')) return [3, 4];
      return [1, 2];
    }
  };

  // 📅 ฟังก์ชันเจเนอเรตปฏิทินแบบ 1 เดือน (เพื่อรองรับการเลื่อนลูกศร < >)
  const getSingleMonthData = (offset: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const mIdx = date.getMonth();
    const year = date.getFullYear() + 543; // ปี พ.ศ.
    const days = new Date(date.getFullYear(), mIdx + 1, 0).getDate();
    const start = date.getDay();
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    return {
      title: `${monthNames[mIdx]} ${year}`,
      days: Array.from({length: days}, (_, j) => j + 1),
      empty: Array.from({length: start}, (_, k) => k)
    };
  };

  const updatePassenger = (type: 'adult' | 'child' | 'infant', operation: 'add' | 'sub') => {
    setPassengers(prev => {
      const newVal = operation === 'add' ? prev[type] + 1 : prev[type] - 1;
      if (type === 'adult' && newVal < 1) return prev; 
      if (newVal < 0) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const getPopupIconStyle = (text: string, isNumber = false) => {
    if (isNumber) return { bg: '#F9E8B6', color: '#FBC02D', icon: 'train-outline' };
    if (text.includes('ด่วนพิเศษ') || text.includes('ชั้น 1')) return { bg: '#EBE4FF', color: '#5E35B1', icon: 'train' };
    if (text.includes('รถเร็ว') || text.includes('พัดลม')) return { bg: '#D4F1E5', color: '#4CAF50', icon: 'train' };
    if (text.includes('ปรับอากาศ')) return { bg: '#D4F1E5', color: '#4CAF50', icon: 'train' };
    return { bg: '#F5F5F5', color: '#757575', icon: 'train' }; 
  };

  // 📝 องค์ประกอบ Calendar 1 กล่อง (ใช้ซ้ำได้ทั้งไปและกลับ)
  const renderCalendarCard = (type: 'dep' | 'ret') => {
    const isRet = type === 'ret';
    const isDisabled = isRet && tripType === 'one-way'; // จางลงและกดไม่ได้ถ้าเป็นเที่ยวเดียว
    const offset = isRet ? retMonthOffset : depMonthOffset;
    const setOffset = isRet ? setRetMonthOffset : setDepMonthOffset;
    const monthData = getSingleMonthData(offset);

    return (
      <View style={[styles.calendarCard, isDisabled && {opacity: 0.4}]}>
        <View style={styles.calendarHeaderRow}>
          <View>
            <Text style={styles.calendarMonthText}>{monthData.title}</Text>
            <Text style={styles.calendarSubText}>{isRet ? 'เลือกวันกลับ' : 'เลือกวันไป'}</Text>
          </View>
          <View style={styles.calendarArrows}>
            <TouchableOpacity onPress={() => setOffset(offset - 1)} style={styles.calArrowBox}>
              <Ionicons name="chevron-back" size={16} color="#BDBDBD" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOffset(offset + 1)} style={styles.calArrowBox}>
              <Ionicons name="chevron-forward" size={16} color="#757575" />
            </TouchableOpacity>
          </View>
        </View>

        <View pointerEvents={isDisabled ? 'none' : 'auto'} style={styles.daysGrid}>
          {/* หัวตารางวัน */}
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, idx) => (
            <Text key={d} style={[styles.dayHead, (idx === 0 || idx === 6) && {color: '#E91E63'}]}>{d}</Text>
          ))}
          
          {/* ช่องว่างต้นเดือน */}
          {monthData.empty.map(i => <View key={`e-${i}`} style={styles.dayCell} />)}
          
          {/* วันที่ทั้งหมด */}
          {monthData.days.map((day, idx) => {
            const dayOfWeek = (monthData.empty.length + idx) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; 
            const dateStr = `${day} ${monthData.title}`;
            
            // เช็คว่าตรงกับวันที่เลือกอยู่ไหม
            const isSelected = isRet ? returnDate === dateStr : departureDate === dateStr;

            return (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayCell, isSelected && styles.dayCellSelected]} 
                onPress={() => { 
                  if(isRet) setReturnDate(dateStr); 
                  else setDepartureDate(dateStr); 
                  // ไม่ปิด Modal ทันที รอให้กด "ยืนยันวัน" ตามภาพเรฟ
                }}
              >
                <Text style={[styles.dayText, isWeekend && {color: '#E91E63'}, isSelected && {color: '#FFF'}]}>{day}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      
      {/* 🌊 Header พื้นสีน้ำเงินเข้ม */}
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
        
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Ticket</Text>
            <View style={{width: 40}} />
          </View>

          {/* 🔘 Tab เที่ยวเดียว / ไปกลับ */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, tripType === 'one-way' && styles.tabActive]} onPress={() => setTripType('one-way')}>
              <Text style={[styles.tabText, tripType === 'one-way' && styles.tabTextActive]}>เที่ยวเดียว</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tripType === 'round-trip' && styles.tabActive]} onPress={() => setTripType('round-trip')}>
              <Text style={[styles.tabText, tripType === 'round-trip' && styles.tabTextActive]}>ไปกลับ</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🗺️ การ์ด 1: เส้นทางและวันที่ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เส้นทาง</Text>
          
          <View style={styles.routeBox}>
            <View style={styles.routeTimeline}>
              <View style={styles.dotOrigin} />
              <View style={styles.lineVertical} />
              <View style={styles.dotDestination} />
            </View>

            <View style={{flex: 1}}>
              <TouchableOpacity style={styles.stationInput} onPress={() => { setSelectingType('origin'); setActiveModal('station'); }}>
                <Text style={styles.inputLabelSmall}>ต้นทาง</Text>
                <Text style={[styles.stationValue, origin.includes('เลือก') && {color: '#9E9E9E'}]}>{origin}</Text>
              </TouchableOpacity>
              <View style={styles.dividerLine} />
              <TouchableOpacity style={styles.stationInput} onPress={() => { setSelectingType('destination'); setActiveModal('station'); }}>
                <Text style={styles.inputLabelSmall}>ปลายทาง</Text>
                <Text style={[styles.stationValue, destination.includes('เลือก') && {color: '#9E9E9E'}]}>{destination}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.swapBtn} onPress={() => {const t=origin; setOrigin(destination); setDestination(t);}}>
              <Ionicons name="sync" size={20} color="#5E35B1" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            {/* 📌 เปลี่ยนมาใช้การเปิด activeModal = 'calendar' อันเดียวทั้งคู่เลย */}
            <TouchableOpacity style={styles.dateBox} onPress={() => setActiveModal('calendar')}>
              <View style={styles.dateTitleRow}>
                <Ionicons name="calendar-outline" size={14} color="#757575" />
                <Text style={styles.inputLabelSmall}>วันไป</Text>
              </View>
              <Text style={[styles.dateValue, departureDate.includes('เลือก') && {color: '#9E9E9E'}]}>{departureDate}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dateBox, tripType === 'one-way' && styles.dateBoxDisabled]} 
              onPress={() => setActiveModal('calendar')} // เปิด Modal เดียวกัน
              disabled={tripType === 'one-way'}
            >
              <View style={styles.dateTitleRow}>
                <Ionicons name="calendar-outline" size={14} color={tripType === 'one-way' ? '#BDBDBD' : '#757575'} />
                <Text style={[styles.inputLabelSmall, tripType === 'one-way' && {color: '#BDBDBD'}]}>วันกลับ</Text>
              </View>
              <Text style={[styles.dateValue, (returnDate.includes('เลือก') || tripType === 'one-way') && {color: '#BDBDBD'}]}>
                {tripType === 'one-way' ? 'เลือกวันกลับ' : returnDate}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 👥 การ์ด 2: จำนวนผู้โดยสาร */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>จำนวนผู้โดยสาร</Text>
          
          <View style={styles.passengerRow}>
            <View style={[styles.iconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="person" size={20} color="#5E35B1" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>ผู้ใหญ่</Text>
              <Text style={styles.passengerSub}>อายุ 12 ปีขึ้นไป</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('adult', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.adult}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('adult', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.passengerRow}>
            <View style={[styles.iconBox, {backgroundColor: '#D4F1E5'}]}><Ionicons name="happy" size={20} color="#4CAF50" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>เด็ก</Text>
              <Text style={styles.passengerSub}>อายุ 3-11 ปี</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('child', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.child}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('child', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>

          <View style={[styles.passengerRow, {borderBottomWidth: 0, paddingBottom: 0}]}>
            <View style={[styles.iconBox, {backgroundColor: '#F9E8B6'}]}><MaterialCommunityIcons name="human-cane" size={20} color="#FBC02D" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>ผู้สูงอายุ</Text>
              <Text style={styles.passengerSub}>อายุ 60 ปีขึ้นไป (ลด 50%)</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('infant', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.infant}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('infant', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 💺 การ์ด 3: ชั้นและตู้โดยสาร */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ชั้นและตู้โดยสาร</Text>
          
          <TouchableOpacity style={styles.optionRow} onPress={() => setActiveModal('trainType')}>
            <View style={[styles.iconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="train" size={20} color="#5E35B1" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>ชั้นโดยสาร</Text>
              <Text style={styles.optionValue}>{trainType}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRow} onPress={() => setActiveModal('cabinClass')}>
            <View style={[styles.iconBox, {backgroundColor: '#D4F1E5'}]}><MaterialCommunityIcons name="ticket-confirmation" size={20} color="#4CAF50" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>ประเภทตู้</Text>
              <Text style={styles.optionValue} numberOfLines={1}>{cabinClass}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionRow, {borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0}]} onPress={() => setActiveModal('cabinNumber')}>
            <View style={[styles.iconBox, {backgroundColor: '#F9E8B6'}]}><Ionicons name="train-outline" size={20} color="#FBC02D" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>เลขตู้ขบวน</Text>
              <Text style={styles.optionValue}>ตู้ที่ {cabinNumber}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* 🕒 การค้นหาล่าสุด */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="search" size={20} color="#333" />
              <Text style={styles.recentTitle}> การค้นหาล่าสุด</Text>
            </View>
            <TouchableOpacity><Text style={styles.seeAllText}>ดูทั้งหมด</Text></TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 20}}>
            {['เชียงใหม่', 'หัวหิน', 'ชลบุรี'].map((city, index) => (
              <View key={index} style={styles.recentCard}>
                <Text style={styles.recentCityText}>กรุงเทพ</Text>
                <Ionicons name="arrow-down" size={14} color="#757575" style={{marginVertical: 2}} />
                <Text style={styles.recentCityText}>{city}</Text>
                <Text style={styles.recentDateText}>15 ก.พ. 2026</Text>
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      {/* 🔘 ปุ่มค้นหาเที่ยวลอยด้านล่าง */}
      <View style={styles.bottomSearchContainer}>
        <TouchableOpacity 
          style={styles.searchBtn} 
          onPress={() => router.push({
            pathname: '/(booking)/search-results',
            params: { origin, destination, departureDate, trainType, cabinClass, cabinNumber, adults: passengers.adult, children: passengers.child, infants: passengers.infant }
          })}
        >
          <Ionicons name="search" size={20} color="#FFF" style={{marginRight: 10}} />
          <Text style={styles.searchBtnText}>ค้นหาเที่ยว</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* 🔮 Modals ด้านล่าง */}
      {/* ========================================================= */}

      {/* Modal ค้นหาสถานี (เหมือนเดิม) */}
      <Modal visible={activeModal === 'station'} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: '#FFF'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveModal(null)}><Ionicons name="chevron-back" size={28} color="#333" /></TouchableOpacity>
            <View style={styles.modalSearchBox}><Ionicons name="search" size={20} color="#9E9E9E" /><TextInput style={styles.modalSearchInput} placeholder="ค้นหาสถานี..." onChangeText={setSearchQuery} /></View>
          </View>
          <View style={styles.timelineWrapper}>
            <View style={styles.blackLine} />
            <FlatList data={stations.filter(s => s.station_name.includes(searchQuery))} keyExtractor={(item) => item.id.toString()} renderItem={({item}) => (
              <TouchableOpacity style={styles.timelineItem} onPress={() => { if(selectingType==='origin') setOrigin(item.station_name); else setDestination(item.station_name); setActiveModal(null); }}>
                <View style={styles.nodeWrapper}><View style={styles.nodeBox}><Ionicons name="train" size={16} color="#333" /></View><View style={styles.nodeLink} /></View>
                <View style={{marginLeft: 25}}><Text style={{fontWeight: 'bold'}}>{item.station_name}</Text><Text style={{color: '#9E9E9E', fontSize: 12}}>{item.province}</Text></View>
              </TouchableOpacity>
            )} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ✨ ใหม่! Modal ปฏิทินแบบคู่ (ไป-กลับ ในหน้าเดียว) */}
      <Modal visible={activeModal === 'calendar'} animationType="slide">
        <View style={styles.mainContainer}>
          {/* Header สีน้ำเงินเข้ม */}
          <View style={styles.blueHeaderBg}>
            <View style={styles.headerGraphicCircle} />
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtnCircle}>
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>เลือกวันที่</Text>
                <View style={{width: 40}} />
              </View>
            </SafeAreaView>
          </View>

          <ScrollView 
            contentContainerStyle={{padding: 20, paddingBottom: 100, marginTop: -30}} 
            showsVerticalScrollIndicator={false}
          >
            {/* 📅 การ์ดปฏิทินขาไป */}
            {renderCalendarCard('dep')}

            {/* 📅 การ์ดปฏิทินขากลับ (ถ้าเลือกเที่ยวเดียว การ์ดนี้จะจางและกดไม่ได้) */}
            {renderCalendarCard('ret')}
          </ScrollView>

          {/* 🔘 ปุ่มยืนยันวันลอยด้านล่าง */}
          <View style={styles.bottomSearchContainer}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => setActiveModal(null)}>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{marginRight: 10}} />
              <Text style={styles.searchBtnText}>ยืนยันวัน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal ชั้นโดยสาร / ประเภทตู้ */}
      <Modal visible={activeModal === 'trainType' || activeModal === 'cabinClass'} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{flex:1}} onPress={() => setActiveModal(null)} />
          <View style={styles.whiteSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitleLeft}>{activeModal === 'trainType' ? 'ชั้นโดยสาร' : 'ประเภทตู้โดยสาร'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {(activeModal === 'trainType' ? ['รถเร็ว', 'รถด่วนพิเศษ'] : getCabinOptions()).map(opt => {
                const isSelected = activeModal === 'trainType' ? trainType === opt : cabinClass === opt;
                const styleData = getPopupIconStyle(opt); 
                
                return (
                  <TouchableOpacity 
                    key={opt} 
                    style={styles.sheetOptionRow} 
                    onPress={() => { 
                      if(activeModal === 'trainType') { 
                        setTrainType(opt); 
                        setCabinClass(opt==='รถเร็ว' ? 'ตู้นั่งพัดลม ชั้น 3' : 'ตู้นอนปรับอากาศ ชั้น 2'); 
                      } else { 
                        setCabinClass(opt); 
                      } 
                      setActiveModal(null); 
                    }}
                  >
                    <View style={[styles.sheetIconBox, {backgroundColor: styleData.bg}]}>
                      <Ionicons name={styleData.icon as any} size={20} color={styleData.color} />
                    </View>
                    <Text style={styles.sheetOptionText}>{opt}</Text>
                    
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal เลขตู้ขบวน */}
      <Modal visible={activeModal === 'cabinNumber'} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{flex:1}} onPress={() => setActiveModal(null)} />
          <View style={styles.whiteSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitleLeft}>เลขตู้ขบวน</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {getNumberOptions().map(num => {
                const isSelected = cabinNumber === num.toString();
                const styleData = getPopupIconStyle('', true); 
                
                return (
                  <TouchableOpacity 
                    key={num} 
                    style={styles.sheetOptionRow} 
                    onPress={() => { setCabinNumber(num.toString()); setActiveModal(null); }}
                  >
                    <View style={[styles.sheetIconBox, {backgroundColor: styleData.bg}]}>
                      <Ionicons name={styleData.icon as any} size={20} color={styleData.color} />
                    </View>
                    <Text style={styles.sheetOptionText}>ตู้ที่ {num}</Text>
                    
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// 📐 สไตล์ทั้งหมด
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  
  blueHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 50, overflow: 'hidden' },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2E3166' },
  headerSafeArea: { paddingHorizontal: 20, paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 30, padding: 5, elevation: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 25 },
  tabActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 3 },
  tabText: { color: '#D1C4E9', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#262956' },

  scrollContent: { padding: 20, paddingBottom: 100, marginTop: -30 }, 

  card: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#757575', marginBottom: 15 },
  
  routeBox: { borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', position: 'relative', marginBottom: 15 },
  routeTimeline: { alignItems: 'center', marginRight: 15 },
  dotOrigin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5E35B1' },
  lineVertical: { width: 2, height: 40, backgroundColor: '#E0E0E0', marginVertical: 2 },
  dotDestination: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#5E35B1', backgroundColor: '#FFF' },
  stationInput: { paddingVertical: 5 },
  inputLabelSmall: { fontSize: 10, color: '#9E9E9E', marginBottom: 2 },
  stationValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dividerLine: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 10 },
  swapBtn: { position: 'absolute', right: 15, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F2FF', justifyContent: 'center', alignItems: 'center', elevation: 1 },

  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateBox: { flex: 1, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 15, padding: 15, marginRight: 5 },
  dateBoxDisabled: { backgroundColor: '#FAFAFA' },
  dateTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dateValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  passengerInfo: { flex: 1 },
  passengerType: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  passengerSub: { fontSize: 11, color: '#9E9E9E' },
  counterGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 5 },
  countBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  countBtnText: { fontSize: 16, fontWeight: 'bold', color: '#757575' },
  countValue: { width: 30, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333' },

  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  optionInfo: { flex: 1 },
  optionValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  recentSection: { marginTop: 10, paddingHorizontal: 5 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  recentTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  seeAllText: { color: '#5E35B1', fontSize: 12, fontWeight: 'bold' },
  recentCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginRight: 15, width: 120, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  recentCityText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  recentDateText: { fontSize: 10, color: '#9E9E9E', marginTop: 8 },

  bottomSearchContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  searchBtn: { backgroundColor: '#4A41A3', flexDirection: 'row', height: 55, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#4A41A3', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  searchBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  whiteSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: 350, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitleLeft: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 25 },
  
  sheetOptionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sheetIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetOptionText: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333' },
  
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  radioCircleSelected: { borderColor: '#5E35B1' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5E35B1' },

  // ====================================
  // ✨ สไตล์สำหรับ ปฏิทินแบบใหม่ (2 กล่อง)
  // ====================================
  calendarCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#EEEEEE' },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarMonthText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  calendarSubText: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  calendarArrows: { flexDirection: 'row' },
  calArrowBox: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHead: { width: '14.28%', textAlign: 'center', color: '#757575', fontSize: 12, marginBottom: 10 },
  dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  dayCellSelected: { backgroundColor: '#5E35B1', borderRadius: 15 }, // วงกลมเน้นวัน
  dayText: { fontSize: 14, color: '#333', fontWeight: '500' },

  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalSearchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, height: 45, marginLeft: 10 },
  modalSearchInput: { flex: 1, marginLeft: 10 },
  timelineWrapper: { flex: 1, paddingLeft: 30 },
  blackLine: { position: 'absolute', left: 45, top: 0, bottom: 0, width: 6, backgroundColor: '#000' },
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  nodeWrapper: { width: 40, alignItems: 'center' },
  nodeBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  nodeLink: { width: 15, height: 4, backgroundColor: '#000', position: 'absolute', right: -15 },
});
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../supabase";

// ดึงขนาดความกว้างของหน้าจอเพื่อนำมาคำนวณหรือจัด Layout ในสัดส่วนที่เหมาะสม
const { width } = Dimensions.get("window");

export default function SearchResultsScreen() {
  // รับพารามิเตอร์ที่ส่งต่อมาจากหน้าค้นหา (Search Screen) ผ่าน URL Parameters
  const params = useLocalSearchParams();
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    tripType,
    trainType,
    cabinClass,
    cabinNumber,
    adults,
    children,
    isReturnLeg,
  } = params;

  // 🚀 LOGIC: เช็คว่าเป็นขาไปหรือขากลับ
  // ถ้าเป็นขากลับ (isReturnLeg === "true") จะทำการสลับสถานีต้นทาง-ปลายทาง และใช้วันที่เดินทางกลับ
  const isReturn = isReturnLeg === "true";
  const currentOrigin = isReturn ? String(destination) : String(origin);
  const currentDest = isReturn ? String(origin) : String(destination);
  const currentDate = isReturn ? String(returnDate) : String(departureDate);

  // การจัดการสถานะ (State) ภายใน Component
  const [loading, setLoading] = useState(true); // สถานะการโหลดข้อมูล
  const [distance, setDistance] = useState(0); // ระยะทางระหว่างสถานี (กม.)
  const [realSchedules, setRealSchedules] = useState<any[]>([]); // รายการรอบรถที่กรองแล้ว

  // คำนวณจำนวนที่นั่งทั้งหมดที่ต้องการจอง (ผู้ใหญ่ + เด็ก)
  const totalPax = Number(adults) + Number(children);

  // เรียกฟังก์ชัน fetchSchedules เมื่อ Component ถูก Mount ครั้งแรก
  useEffect(() => {
    fetchSchedules();
  }, []);

  /**
   * ฟังก์ชันสำหรับแปลงวันที่ภาษาไทย (เช่น "1 มกราคม 2567") 
   * ให้เป็นรูปแบบสากล (YYYY-MM-DD) เพื่อใช้ในการ Query ฐานข้อมูล Supabase
   */
  const parseThaiDateToDB = (thaiDateStr: string) => {
    if (!thaiDateStr || thaiDateStr.includes("เลือก")) return null;
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    const parts = thaiDateStr.split(" ");
    if (parts.length !== 3) return null;
    const d = parts[0].padStart(2, "0");
    const m = (months.indexOf(parts[1]) + 1).toString().padStart(2, "0");
    const y = parseInt(parts[2]) - 543; // แปลง พ.ศ. เป็น ค.ศ.
    return `${y}-${m}-${d}`;
  };

  /**
   * 🚀 ฟังก์ชันช่วยดึงความจุที่นั่งให้ตรงตาม Class
   * กรณีที่ในฐานข้อมูลไม่มีค่า available_seats ระบุไว้ จะใช้ค่า Default ตามเงื่อนไขนี้
   */
  const getCapacityFallback = (tType: string, cClass: string) => {
    if (tType === "รถด่วนพิเศษ") {
      if (cClass.includes("ชั้น 1")) return 24;
      if (cClass.includes("วีลแชร์")) return 36;
      return 40;
    }
    if (cClass.includes("ชั้น 3")) return 76;
    if (cClass.includes("นั่งปรับอากาศ") && !cClass.includes("ตู้นอน"))
      return 72;
    if (cClass.includes("ตู้นอน")) return 40;
    return 48;
  };

  /**
   * ฟังก์ชันหลักสำหรับดึงข้อมูลตารางเดินรถจาก Supabase
   */
  const fetchSchedules = async () => {
    setLoading(true);

    try {
      // 1. ดึงข้อมูล ID และตำแหน่งกิโลเมตร (km) ของสถานีต้นทางและปลายทาง
      const { data: stData } = await supabase
        .from("stations")
        .select("id, station_name, km")
        .in("station_name", [currentOrigin, currentDest]);

      let originId = null;
      let destId = null;
      let originKm = 0;
      let destKm = 0;

      if (stData && stData.length === 2) {
        const oSt = stData.find((s) => s.station_name === currentOrigin);
        const dSt = stData.find((s) => s.station_name === currentDest);
        if (oSt && dSt) {
          originId = oSt.id;
          destId = dSt.id;
          originKm = oSt.km;
          destKm = dSt.km;
          setDistance(Math.abs(originKm - destKm));
        }
      }

      // หากไม่พบข้อมูลสถานีที่ระบุ ให้หยุดการทำงาน
      if (!originId || !destId) {
        setRealSchedules([]);
        setLoading(false);
        return;
      }

      // 2. ดึงข้อมูลจุดจอด (train_stops) ของสถานีต้นทาง
      const { data: originStops } = await supabase
        .from("train_stops")
        .select("train_id, stop_order, departure_time")
        .eq("station_id", originId);

      // 3. ดึงข้อมูลจุดจอด (train_stops) ของสถานีปลายทาง
      const { data: destStops } = await supabase
        .from("train_stops")
        .select("train_id, stop_order, arrival_time")
        .eq("station_id", destId);

      // 4. กรองขบวนรถ (train_id) ที่วิ่งผ่านทั้งต้นทางและปลายทาง 
      // และต้องมีลำดับจุดจอดต้นทาง (stop_order) ก่อนปลายทางเสมอ
      const validRoutes: any[] = [];
      if (originStops && destStops) {
        originStops.forEach((o) => {
          const d = destStops.find(
            (dest) =>
              dest.train_id === o.train_id && dest.stop_order > o.stop_order,
          );
          if (d) {
            validRoutes.push({
              train_id: o.train_id,
              dep_time: o.departure_time
                ? o.departure_time.substring(0, 5)
                : null,
              arr_time: d.arrival_time ? d.arrival_time.substring(0, 5) : null,
            });
          }
        });
      }

      if (validRoutes.length === 0) {
        setRealSchedules([]);
        setLoading(false);
        return;
      }

      const validTrainIds = validRoutes.map((r) => r.train_id);
      const dbDate = parseThaiDateToDB(currentDate);

      // 5. ดึงข้อมูลเที่ยวรถ (trips) ที่เปิดให้บริการตามวันที่และประเภทรถที่ผู้ใช้เลือก
      const { data: tripData } = await supabase
        .from("trips")
        .select(
          `id, train_id, status, available_seats, trains!inner ( id, type )`,
        )
        .in("train_id", validTrainIds)
        .eq("trains.type", String(trainType))
        .eq("departure_date", dbDate)
        .eq("status", "Scheduled");

      if (tripData && tripData.length > 0) {
        // 6. ประมวลผลข้อมูลแต่ละเที่ยว เพื่อเช็คจำนวนที่นั่งว่างที่แท้จริง
        const formattedTrips = await Promise.all(
          tripData.map(async (t: any) => {
            const routeInfo = validRoutes.find(
              (r) => r.train_id === t.train_id,
            );
            const exactDep = routeInfo?.dep_time || "00:00";
            const exactArr =
              routeInfo?.arr_time ||
              getFallbackArrivalTime(exactDep, Math.abs(originKm - destKm));

            // ตรวจสอบข้อมูลการจอง (bookings) เพื่อสรุปจำนวนที่นั่งที่ถูกจองไปแล้ว
            const { data: bookingsData } = await supabase
              .from("bookings")
              .select("selected_seats")
              .eq("trip_id", t.id);

            let bookedCount = 0;
            if (bookingsData) {
              bookingsData.forEach((b) => {
                if (b.selected_seats) {
                  // นับจำนวนที่นั่งจาก String ที่คั่นด้วยคอมม่า
                  bookedCount += b.selected_seats
                    .split(",")
                    .filter((s: string) => s.trim() !== "").length;
                }
              });
            }

            // 🚀 เรียกใช้ Capacity ตรงนี้ให้ตรงประเภท
            const totalCapacity =
              t.available_seats ||
              getCapacityFallback(String(trainType), String(cabinClass));
            const remainingSeats = totalCapacity - bookedCount;

            return {
              id: t.id,
              dep: exactDep,
              arr: exactArr,
              durationText: calculateRealDuration(exactDep, exactArr),
              remainingSeats,
              isFull: remainingSeats < totalPax, // ถ้าที่นั่งว่างไม่พอสำหรับจำนวนผู้โดยสาร ให้แสดงว่าเต็ม
            };
          }),
        );

        // เรียงลำดับเที่ยวรถตามเวลาออกเดินทาง
        formattedTrips.sort((a, b) => a.dep.localeCompare(b.dep));
        setRealSchedules(formattedTrips);
      } else {
        setRealSchedules([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * คำนวณระยะเวลาเดินทาง (ชั่วโมง และ นาที) จากเวลาออกและเวลาถึง
   */
  const calculateRealDuration = (dep: string, arr: string) => {
    if (!dep || !arr) return "--ชม. --น.";
    const [dh, dm] = dep.split(":").map(Number);
    const [ah, am] = arr.split(":").map(Number);
    let mins = ah * 60 + am - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60; // รองรับกรณีเดินทางข้ามคืน
    return `${Math.floor(mins / 60)}ชม. ${mins % 60}น.`;
  };

  /**
   * ฟังก์ชันคำนวณเวลาถึงโดยประมาณ หากในฐานข้อมูลไม่มีข้อมูลระบุไว้
   */
  const getFallbackArrivalTime = (depTime: string, dist: number) => {
    const travelHours = dist / (trainType === "รถด่วนพิเศษ" ? 70 : 50);
    const [h, m] = depTime.split(":").map(Number);
    let arrivalH = h + Math.floor(travelHours);
    let arrivalM = m + Math.round((travelHours % 1) * 60);
    if (arrivalM >= 60) {
      arrivalH += 1;
      arrivalM -= 60;
    }
    if (arrivalH >= 24) arrivalH -= 24;
    return `${arrivalH.toString().padStart(2, "0")}:${arrivalM.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.mainContainer}>
      {/* ส่วนหัวของหน้าจอ (Header) ที่มีสีน้ำเงินและดีไซน์วงกลมกราฟิก */}
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtnCircle}
            >
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isReturn ? "เลือกรอบรถ (ขากลับ)" : "เวลาออกเดินทาง"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* กล่องสรุปเส้นทาง (ต้นทาง -> ปลายทาง) พร้อมเวลาและระยะเวลาเดินทาง */}
          <View style={styles.routeSummaryBox}>
            <View style={styles.routeCol}>
              <Text style={styles.routeCity} numberOfLines={1}>
                {currentOrigin}
              </Text>
              <Text style={styles.routeTimeSmall}>
                {realSchedules[0] ? realSchedules[0].dep : "--:--"}น.
              </Text>
            </View>
            <View style={styles.routeCenter}>
              <Ionicons name="arrow-forward" size={24} color="#D1C4E9" />
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>
                  {realSchedules[0] ? realSchedules[0].durationText : "--"}
                </Text>
              </View>
            </View>
            <View style={styles.routeCol}>
              <Text style={styles.routeCity} numberOfLines={1}>
                {currentDest}
              </Text>
              <Text style={styles.routeTimeSmall}>
                {realSchedules[0] ? realSchedules[0].arr : "--:--"}น.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ส่วนแสดงเนื้อหา: ถ้ากำลังโหลดให้โชว์ Spinner ถ้าโหลดเสร็จให้โชว์รายการรอบรถ */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#5E35B1"
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.dateSubTitle}>
            {currentDate} • {realSchedules.length} เที่ยว
          </Text>

          {/* แสดงข้อความแจ้งเตือนหากไม่มีเที่ยวรถที่ค้นหา */}
          {realSchedules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="train-outline" size={50} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                ไม่มีรอบรถวิ่งระหว่างสถานีนี้
              </Text>
            </View>
          ) : (
            // วนลูปแสดง Card รายการเที่ยวรถที่ค้นพบ
            realSchedules.map((item) => (
              <View
                key={item.id}
                style={[styles.tripCard, item.isFull && styles.tripCardFull]}
              >
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.trainInfoMain}>
                    {trainType} • {currentDest}
                  </Text>
                  <Text style={styles.trainInfoSub}>{cabinClass}</Text>
                </View>

                {/* ส่วนแสดงเวลาเดินทางขนาดใหญ่ */}
                <View style={styles.timeRow}>
                  <View style={styles.timeSideBlock}>
                    <Text style={styles.timeHuge}>{item.dep}</Text>
                  </View>
                  <View style={styles.arrowBlock}>
                    <View style={styles.arrowLine} />
                    <Ionicons
                      name="caret-forward"
                      size={16}
                      color="#9E9E9E"
                      style={styles.arrowHead}
                    />
                  </View>
                  <View
                    style={[styles.timeSideBlock, { alignItems: "flex-end" }]}
                  >
                    <Text style={styles.timeHuge}>{item.arr}</Text>
                  </View>
                </View>

                {/* ส่วนแสดงชื่อสถานีต้นทาง-ปลายทาง และระยะเวลา */}
                <View style={styles.stationRow}>
                  <View style={styles.stationSideBlock}>
                    <Text style={styles.stationSmall} numberOfLines={1}>
                      {currentOrigin}
                    </Text>
                  </View>
                  <View style={styles.durationBlock}>
                    <Text style={styles.durationTextCenter}>
                      {item.durationText}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.stationSideBlock,
                      { alignItems: "flex-end" },
                    ]}
                  >
                    <Text style={styles.stationSmall} numberOfLines={1}>
                      {currentDest}
                    </Text>
                  </View>
                </View>

                <View style={styles.dashedDivider} />

                {/* ส่วนท้ายของ Card: บอกสถานะที่นั่งและปุ่มสำหรับกดเลือกเที่ยวรถ */}
                <View style={styles.cardBottom}>
                  <View style={styles.statusGroup}>
                    {item.isFull ? (
                      <>
                        <Ionicons name="close" size={20} color="#F44336" />
                        <Text style={styles.statusFullText}>
                          ที่นั่งเต็มแล้ว
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#4CAF50" />
                        <Text style={styles.statusAvailableText}>
                          ว่าง {item.remainingSeats} ที่นั่ง
                        </Text>
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.selectBtn,
                      item.isFull && styles.selectBtnDisabled,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/(booking)/select-seat",
                        params: {
                          ...params,
                          depTime: item.dep,
                          arrTime: item.arr,
                          duration: item.durationText,
                          trip_id: item.id,
                        },
                      })
                    }
                    disabled={item.isFull}
                  >
                    <Text
                      style={[
                        styles.selectBtnText,
                        item.isFull && styles.selectBtnTextDisabled,
                      ]}
                    >
                      เลือกเที่ยวนี้
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// การกำหนดสไตล์ (Styles) สำหรับ Component ทั้งหมด
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F9F9F9" },
  blueHeaderBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 40,
    overflow: "hidden",
  },
  headerGraphicCircle: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#2E3166",
  },
  headerSafeArea: { paddingHorizontal: 20, paddingTop: 10 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  routeSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  routeCol: { flex: 1, alignItems: "center" },
  routeCity: { fontSize: 16, fontWeight: "bold", color: "#FFF" },
  routeTimeSmall: { fontSize: 10, color: "#D1C4E9", marginTop: 2 },
  routeCenter: { width: 80, alignItems: "center", justifyContent: "center" },
  durationBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 5,
  },
  durationBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  scrollContent: { padding: 20, paddingBottom: 50 },
  dateSubTitle: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 20,
    marginLeft: 5,
  },
  tripCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  tripCardFull: { borderLeftWidth: 4, borderLeftColor: "#F44336" },
  cardHeaderInfo: { marginBottom: 20 },
  trainInfoMain: { fontSize: 14, fontWeight: "bold", color: "#333" },
  trainInfoSub: { fontSize: 11, color: "#9E9E9E", marginTop: 2 },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeSideBlock: { flex: 1, alignItems: "flex-start" },
  timeHuge: { fontSize: 26, fontWeight: "bold", color: "#333" },
  arrowBlock: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  arrowLine: { flex: 1, height: 2, backgroundColor: "#BDBDBD" },
  arrowHead: { marginLeft: -5 },
  stationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  stationSideBlock: { flex: 1, alignItems: "flex-start" },
  stationSmall: { fontSize: 10, color: "#9E9E9E" },
  durationBlock: { flex: 1.5, alignItems: "center" },
  durationTextCenter: { fontSize: 10, color: "#9E9E9E" },
  dashedDivider: {
    height: 1,
    width: "100%",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E0E0E0",
    borderRadius: 1,
    marginVertical: 20,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusGroup: { flexDirection: "row", alignItems: "center" },
  statusAvailableText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
    marginLeft: 5,
  },
  statusFullText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F44336",
    marginLeft: 5,
  },
  selectBtn: {
    backgroundColor: "#5E35B1",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  selectBtnDisabled: { backgroundColor: "#F5F5F5" },
  selectBtnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  selectBtnTextDisabled: { color: "#9E9E9E" },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#9E9E9E", marginTop: 15, fontSize: 16 },
});
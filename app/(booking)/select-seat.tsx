import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../supabase";

const { width } = Dimensions.get("window");

export default function SelectSeatScreen() {
  const params = useLocalSearchParams();
  const {
    origin,
    destination,
    departureDate,
    trainType,
    cabinClass,
    cabinNumber: initialCabin,
    adults,
    children,
    infants,
    depTime,
    arrTime,
    duration,
    trip_id,
  } = params;

  const isReturn = params.isReturnLeg === "true";
  const isRoundTrip = params.tripType === "round-trip";
  const currentOrigin = isReturn ? String(destination) : String(origin);
  const currentDest = isReturn ? String(origin) : String(destination);

  const totalPax = Number(adults) + Number(children);

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🚀 FIXED: ฟังก์ชันดึงเลขตู้ (แก้ตรรกะให้เช็ควีลแชร์ก่อนชั้น 2)
  const getNumberOptions = () => {
    const cClass = String(cabinClass);
    if (trainType === "รถด่วนพิเศษ") {
      if (cClass.includes("วีลแชร์") || cClass.includes("ผู้พิการ")) return [6];
      if (cClass.includes("ชั้น 1")) return [11];
      return [1, 2, 3, 4, 5, 7, 8, 9, 10]; // นอกนั้นเหมาเป็นชั้น 2 ปกติ
    } else {
      if (cClass.includes("ชั้น 3")) return [5, 6, 7, 8, 9, 10, 11];
      if (cClass.includes("นั่งปรับอากาศ") && !cClass.includes("ตู้นอน"))
        return [3, 4];
      return [1, 2]; // ตู้นอนชั้น 2
    }
  };

  const validCabins = getNumberOptions();

  // 🚀 FIXED: ถ้ารับเลขตู้จากหน้าแรกมาแล้วมันมั่ว (เช่น รับตู้ 1 มาแต่มันเป็นวีลแชร์) มันจะเปลี่ยนเป็นตู้ 6 ให้เลย
  const [currentCabinNum, setCurrentCabinNum] = useState(
    validCabins.includes(Number(initialCabin))
      ? String(initialCabin)
      : String(validCabins[0]),
  );

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: stData } = await supabase
      .from("stations")
      .select("km")
      .in("station_name", [currentOrigin, currentDest]);
    if (stData && stData.length === 2) {
      setDistance(Math.abs(stData[0].km - stData[1].km));
    }

    if (trip_id) {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("selected_seats")
        .eq("trip_id", trip_id);
      if (bookingsData) {
        let allBooked: string[] = [];
        bookingsData.forEach((booking) => {
          if (booking.selected_seats) {
            const seats = booking.selected_seats
              .split(",")
              .map((s: string) => s.trim());
            seats.forEach((s: string) => {
              if (s.includes("-")) allBooked.push(s);
              else allBooked.push(`1-${s}`);
            });
          }
        });
        setBookedSeats(allBooked);
      }
    }
    setLoading(false);
  };

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  const getSeatLayoutConfig = () => {
    let total = 48;
    const tType = String(trainType);
    const cClass = String(cabinClass);

    if (tType === "รถด่วนพิเศษ") {
      if (cClass.includes("ชั้น 1")) total = 24;
      else if (cClass.includes("วีลแชร์") || cClass.includes("ผู้พิการ"))
        total = 36;
      else total = 40;
    } else {
      if (cClass.includes("ชั้น 3")) total = 76;
      else if (cClass.includes("นั่งปรับอากาศ") && !cClass.includes("ตู้นอน"))
        total = 72;
      else if (cClass.includes("ตู้นอน")) total = 40;
      else total = 48;
    }

    const leftCol = [];
    const rightCol = [];
    for (let i = 1; i <= total; i += 4) {
      leftCol.push(i);
      if (i + 2 <= total) {
        rightCol.push(i + 2);
      }
    }

    return {
      total,
      leftCol,
      rightCol,
      isSleeper:
        cClass.includes("ตู้นอน") ||
        cClass.includes("ชั้น 1") ||
        cClass.includes("ชั้น 2"),
    };
  };

  const {
    total: totalSeatsInCabin,
    leftCol,
    rightCol,
    isSleeper,
  } = getSeatLayoutConfig();

  const calculateSeatPrice = (seatId: string) => {
    const [cabin, seatNumStr] = seatId.split("-");
    const seatNum = Number(seatNumStr);
    let baseRate = 0;
    let serviceFee = trainType === "รถด่วนพิเศษ" ? 190 : 50;
    let acFee = String(cabinClass).includes("ปรับอากาศ") ? 150 : 0;
    let berthFee = 0;

    if (String(cabinClass).includes("ชั้น 1")) baseRate = 1.2;
    else if (String(cabinClass).includes("ชั้น 2")) baseRate = 0.8;
    else baseRate = 0.4;

    const baseFare = distance * baseRate;
    if (String(cabinClass).includes("ตู้นอน")) {
      berthFee = seatNum % 2 !== 0 ? 500 : 300;
    }
    return baseFare + serviceFee + acFee + berthFee;
  };

  const getTotalPrice = () => {
    if (selectedSeats.length === 0) return 0;
    let total = 0;
    selectedSeats.forEach((seatId, index) => {
      const seatPrice = calculateSeatPrice(seatId);
      if (index >= Number(adults)) {
        total += seatPrice * 0.7;
      } else {
        total += seatPrice;
      }
    });
    return total;
  };

  const handleSelectSeat = (num: number) => {
    const seatId = `${currentCabinNum}-${num}`;
    if (bookedSeats.includes(seatId)) return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length < totalPax) {
        setSelectedSeats([...selectedSeats, seatId]);
      } else {
        showAlert(
          "เลือกที่นั่งครบแล้ว",
          `คุณเลือกที่นั่งครบตามจำนวนผู้โดยสาร (${totalPax} ท่าน) แล้วครับ`,
        );
      }
    }
  };

  const renderSeat = (num: number) => {
    const seatId = `${currentCabinNum}-${num}`;
    const isSelected = selectedSeats.includes(seatId);
    const isBooked = bookedSeats.includes(seatId);
    let bgColor = "#FFF";
    let textColor = "#333";
    if (isBooked) {
      bgColor = "#757575";
      textColor = "#FFF";
    } else if (isSelected) {
      bgColor = "#4CAF50";
      textColor = "#FFF";
    }

    return (
      <TouchableOpacity
        style={[styles.seatBox, { backgroundColor: bgColor }]}
        onPress={() => handleSelectSeat(num)}
        activeOpacity={isBooked ? 1 : 0.7}
      >
        <Text style={[styles.seatText, { color: textColor }]}>{num}</Text>
      </TouchableOpacity>
    );
  };

  const bookedInThisCabin = bookedSeats.filter((s) =>
    s.startsWith(`${currentCabinNum}-`),
  ).length;
  const selectedInThisCabin = selectedSeats.filter((s) =>
    s.startsWith(`${currentCabinNum}-`),
  ).length;
  const availableSeatsCount =
    totalSeatsInCabin - bookedInThisCabin - selectedInThisCabin;

  if (loading)
    return (
      <View style={styles.loadingArea}>
        <ActivityIndicator size="large" color="#5E35B1" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnCircle}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ขบวน{trainType}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.infoBoxesRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>ขบวน</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {trainType === "รถด่วนพิเศษ" ? "รถด่วนพิเศษ" : "รถเร็ว/รถด่วน"}
            </Text>
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cabinTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {validCabins.map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.cabinTabBtn,
                  currentCabinNum === String(num) && styles.cabinTabBtnActive,
                ]}
                onPress={() => setCurrentCabinNum(String(num))}
              >
                <Text
                  style={[
                    styles.cabinTabText,
                    currentCabinNum === String(num) &&
                      styles.cabinTabTextActive,
                  ]}
                >
                  ตู้ {num}
                </Text>
              </TouchableOpacity>
            ))}
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#757575"
              style={{ alignSelf: "center", marginLeft: 5 }}
            />
          </ScrollView>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: "#FFF",
                  borderWidth: 1,
                  borderColor: "#DDD",
                },
              ]}
            />
            <Text style={styles.legendText}>ว่าง</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#4CAF50" }]} />
            <Text style={styles.legendText}>เลือกแล้ว</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#757575" }]} />
            <Text style={styles.legendText}>ไม่ว่าง</Text>
          </View>
        </View>

        <View style={styles.seatGridContainer}>
          <Text style={styles.cabinTitleText}>{cabinClass}</Text>
          <View style={styles.gridHeader}>
            <View style={styles.facilityBox}>
              <Text style={styles.facilityText}>ห้องน้ำ</Text>
            </View>
          </View>

          <View style={styles.mainGridRow}>
            <View style={styles.seatCol}>
              {isSleeper && (
                <View style={styles.seatPairRowHeader}>
                  <Text style={styles.colHeaderText}>ชั้นล่าง</Text>
                  <Text style={styles.colHeaderText}>ชั้นบน</Text>
                </View>
              )}
              {leftCol.map((n) => (
                <View key={n} style={styles.seatPairRow}>
                  {renderSeat(n)}
                  {n + 1 <= totalSeatsInCabin && renderSeat(n + 1)}
                </View>
              ))}
            </View>

            <View style={styles.aisle}>
              <Text style={styles.aisleText}>ทางเดิน</Text>
            </View>

            <View style={styles.seatCol}>
              {isSleeper && (
                <View style={styles.seatPairRowHeader}>
                  <Text style={styles.colHeaderText}>ชั้นล่าง</Text>
                  <Text style={styles.colHeaderText}>ชั้นบน</Text>
                </View>
              )}
              {rightCol.map((n) => (
                <View key={n} style={styles.seatPairRow}>
                  {renderSeat(n)}
                  {n + 1 <= totalSeatsInCabin && renderSeat(n + 1)}
                </View>
              ))}
            </View>
          </View>

          {isSleeper && (
            <View
              style={[
                styles.gridHeader,
                { alignItems: "flex-end", marginTop: 10 },
              ]}
            >
              <View style={styles.facilityBox}>
                <Text style={styles.facilityText}>ห้องน้ำ</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 💳 Footer */}
      <View style={styles.bottomFooter}>
        <View style={styles.footerRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.footerLabel}>ที่นั่งที่เลือก</Text>
            <Text style={styles.footerValue} numberOfLines={1}>
              {selectedSeats.length > 0
                ? selectedSeats.map((s) => s.replace("-", ": ")).join(", ")
                : "-"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.footerLabel}>ราคารวม</Text>
            <Text style={styles.footerPrice}>
              THB{" "}
              {getTotalPrice().toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            selectedSeats.length !== totalPax && { backgroundColor: "#9E9E9E" },
          ]}
          disabled={selectedSeats.length !== totalPax}
          onPress={() => {
            if (isRoundTrip && !isReturn) {
              router.push({
                pathname: "/(booking)/search-results",
                params: {
                  ...params,
                  isReturnLeg: "true",
                  outboundTripId: trip_id,
                  outboundSeats: selectedSeats.join(", "),
                  outboundPrice: getTotalPrice(),
                  outboundDepTime: depTime,
                  outboundArrTime: arrTime,
                  outboundCabin: currentCabinNum,
                  outboundDuration: duration,
                },
              });
            } else {
              router.push({
                pathname: "/(booking)/summary",
                params: {
                  ...params,
                  cabinNumber: currentCabinNum,
                  selectedSeats: selectedSeats.join(", "),
                  totalPrice: isReturn
                    ? Number(params.outboundPrice) + getTotalPrice()
                    : getTotalPrice(),
                },
              });
            }
          }}
        >
          <Ionicons
            name={isRoundTrip && !isReturn ? "arrow-forward" : "checkmark"}
            size={20}
            color="#FFF"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.confirmBtnText}>
            {isRoundTrip && !isReturn
              ? "ยืนยัน และ เลือกเที่ยวกลับ"
              : `ยืนยันที่นั่ง ${selectedSeats.length} นั่ง`}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}>
              <Ionicons name="information-circle" size={32} color="#5E35B1" />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={styles.alertConfirmBtn}
              onPress={() => setAlertConfig({ ...alertConfig, visible: false })}
            >
              <Text style={styles.alertConfirmBtnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  loadingArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  blueHeaderBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 30,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
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
  infoBoxesRow: { flexDirection: "row", justifyContent: "space-between" },
  infoBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3A3C59",
    marginHorizontal: 4,
    alignItems: "center",
  },
  infoLabel: { color: "#A8AACC", fontSize: 11, marginBottom: 5 },
  infoValue: { color: "#FFF", fontSize: 13, fontWeight: "bold" },
  infoValueGreen: { color: "#4CAF50", fontSize: 16, fontWeight: "bold" },
  scrollContent: { paddingBottom: 150 },
  cabinTabsWrapper: { paddingHorizontal: 20, marginTop: 20, marginBottom: 15 },
  cabinTabBtn: {
    backgroundColor: "#6C6C80",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  cabinTabBtnActive: { backgroundColor: "#5E35B1" },
  cabinTabText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  cabinTabTextActive: { color: "#FFF" },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendBox: { width: 14, height: 14, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 10, color: "#757575", fontWeight: "bold" },
  seatGridContainer: {
    backgroundColor: "#262956",
    marginHorizontal: 20,
    borderRadius: 30,
    padding: 20,
    paddingBottom: 40,
  },
  cabinTitleText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
  },
  gridHeader: {
    alignItems: "flex-start",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  facilityBox: {
    backgroundColor: "#FFF",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  facilityText: { color: "#333", fontSize: 10, fontWeight: "bold" },
  mainGridRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  seatCol: { flex: 1, alignItems: "center" },
  seatPairRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  seatPairRowHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  colHeaderText: {
    width: 36,
    marginHorizontal: 5,
    textAlign: "center",
    color: "#A8AACC",
    fontSize: 10,
  },
  aisle: { width: 70, justifyContent: "center", alignItems: "center" },
  aisleText: {
    color: "#A8AACC",
    fontSize: 24,
    transform: [{ rotate: "-90deg" }],
    fontWeight: "bold",
    width: 100,
    textAlign: "center",
  },
  seatBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  seatText: { fontSize: 12, fontWeight: "bold" },
  bottomFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  footerLabel: { color: "#757575", fontSize: 12, marginBottom: 5 },
  footerValue: { color: "#333", fontSize: 18, fontWeight: "bold" },
  footerPrice: { color: "#333", fontSize: 20, fontWeight: "bold" },
  confirmBtn: {
    backgroundColor: "#5E35B1",
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  alertBox: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EBE4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 5,
    borderColor: "#FFF",
    marginTop: -60,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  alertConfirmBtn: {
    backgroundColor: "#262956",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  alertConfirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../supabase";

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🟢 States สำหรับ Modal ฟอร์ม (เพิ่ม/แก้ไข)
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 🔴 States สำหรับ Modal ยืนยันการลบ
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<number | null>(null);

  // 🟡 NEW: States สำหรับ Modern Alert แจ้งเตือน
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // ข้อมูลในฟอร์ม
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("เปอร์เซ็นต์ (%)");
  const [discountAmount, setDiscountAmount] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expDate, setExpDate] = useState("");
  const [color, setColor] = useState("#5E35B1");

  const [stats, setStats] = useState({ total: 0, used: 0, savedValue: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchCoupons();
    }, []),
  );

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("coupons").select("*");

    if (error) {
      showModernAlert("ดึงข้อมูลล้มเหลว", error.message);
    } else if (data) {
      const sortedData = data.sort((a, b) => b.id - a.id);
      setCoupons(sortedData);
      setStats({ total: sortedData.length, used: 2841, savedValue: 284100 });
    }
    setLoading(false);
  };

  // 🟡 NEW: ฟังก์ชันเรียก Alert แบบทันสมัย
  const showModernAlert = (t: string, m: string) => {
    setAlertTitle(t);
    setAlertMessage(m);
    setAlertVisible(true);
  };

  const handleSaveCoupon = async () => {
    if (!title || !code || !expDate || !discountAmount) {
      // เปลี่ยนจาก Alert.alert เป็น showModernAlert
      showModernAlert(
        "แจ้งเตือน",
        "กรุณากรอกข้อมูลให้ครบ (ชื่อ, โค้ด, มูลค่า, วันหมดอายุ)",
      );
      return;
    }

    setLoading(true);
    const payload = {
      title: title,
      description: desc,
      code: code.toUpperCase(),
      discount_amount: parseFloat(discountAmount),
      expire_date: expDate,
      valid_until: new Date("2026-12-31T23:59:59Z").toISOString(),
      color: color,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", editingId);
      if (error) showModernAlert("ข้อผิดพลาด", error.message);
      else {
        showModernAlert("สำเร็จ!", "แก้ไขคูปองเรียบร้อยแล้ว ✏️");
        closeModal();
        fetchCoupons();
      }
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) showModernAlert("ข้อผิดพลาด", error.message);
      else {
        showModernAlert("สำเร็จ!", "เพิ่มคูปองใหม่เรียบร้อยแล้ว 🎉");
        closeModal();
        fetchCoupons();
      }
    }
    setLoading(false);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setDesc(item.description || "");
    setCode(item.code || "");
    setDiscountAmount(
      item.discount_amount ? item.discount_amount.toString() : "",
    );
    setExpDate(item.expire_date || "");
    setColor(item.color || "#5E35B1");
    setMinPrice("500");
    setUsageLimit("500");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle("");
    setDesc("");
    setCode("");
    setExpDate("");
    setDiscountAmount("");
    setMinPrice("");
    setUsageLimit("");
    setColor("#5E35B1");
  };

  const handleDeleteCoupon = (id: number) => {
    setCouponToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDeleteCoupon = async () => {
    if (!couponToDelete) return;
    setDeleteModalVisible(false);
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", couponToDelete);
    if (error) {
      showModernAlert("ลบล้มเหลว", error.message);
    } else {
      fetchCoupons();
    }
    setCouponToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setCouponToDelete(null);
  };

  const renderCouponRow = ({ item }: { item: any }) => (
    <View style={styles.tableRow}>
      <View
        style={[
          styles.td,
          { flex: 2, flexDirection: "row", alignItems: "center" },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: item.color || "#4CAF50" },
          ]}
        >
          <Ionicons name="star" size={12} color="#FFF" />
        </View>
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.couponNameText} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.couponSubText} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.td,
          { flex: 1.5, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <View
          style={[
            styles.codeBadge,
            { backgroundColor: item.color || "#5E35B1" },
          ]}
        >
          <Text style={styles.codeBadgeText}>{item.code}</Text>
        </View>
      </View>
      <View style={[styles.td, { flex: 1.5, justifyContent: "center" }]}>
        <Text style={styles.mainValueText}>{item.discount_amount} บาท</Text>
        <Text style={styles.subValueText}>ขั้นต่ำ 500</Text>
      </View>
      <View style={[styles.td, { flex: 1.5, justifyContent: "center" }]}>
        <Text style={styles.usageText}>145 / 500</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: "30%", backgroundColor: item.color || "#4CAF50" },
            ]}
          />
        </View>
      </View>
      <View
        style={[
          styles.td,
          { flex: 1, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? "#E8F5E9" : "#FFEBEE" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.is_active ? "#4CAF50" : "#F44336" },
            ]}
          >
            {item.is_active ? "ใช้งาน" : "หมดอายุ"}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.td,
          {
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={styles.actionBtn}
        >
          <Ionicons name="pencil" size={14} color="#757575" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteCoupon(item.id)}
          style={styles.actionBtn}
        >
          <Ionicons name="trash-outline" size={14} color="#757575" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <View style={styles.headerCurve} />
      </View>
      <SafeAreaView edges={["top"]} style={{ zIndex: 10 }}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnCircle}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle}>จัดการคูปองส่วนลด</Text>
            <Text style={styles.headerSub}>เพิ่ม แก้ไข และลบคูปองส่วนลด</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "flex-end", marginBottom: 15 }}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              closeModal();
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.createBtnText}>สร้างคูปองใหม่</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderSection}>
            <Text style={styles.tableTitle}>รายการคูปองทั้งหมด</Text>
            <View style={styles.filterBox}>
              <Text style={styles.filterText}>ทุกสถานะ</Text>
              <Ionicons name="chevron-down" size={14} color="#757575" />
            </View>
          </View>

          <View style={styles.thRow}>
            <Text style={[styles.thText, { flex: 2 }]}>คูปอง</Text>
            <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>
              โค้ด
            </Text>
            <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>
              ส่วนลด
            </Text>
            <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>
              ใช้ไปแล้ว
            </Text>
            <Text style={[styles.thText, { flex: 1, textAlign: "center" }]}>
              สถานะ
            </Text>
            <Text style={[styles.thText, { flex: 1, textAlign: "center" }]}>
              จัดการ
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#5E35B1"
              style={{ marginVertical: 30 }}
            />
          ) : (
            <View style={styles.tbody}>
              {coupons.length > 0 ? (
                coupons.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderCouponRow({ item })}
                  </React.Fragment>
                ))
              ) : (
                <Text style={styles.emptyText}>ไม่มีข้อมูลคูปอง</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 📝 Modal ฟอร์ม (เพิ่ม/แก้ไข) */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}
                </Text>
                <Text style={styles.modalSubTitle}>กำหนดเงื่อนไขและส่วนลด</Text>
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.label}>ชื่อคูปอง (Title)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="เช่น โปรสงกรานต์ 2026"
                placeholderTextColor="#BDBDBD"
              />
              <Text style={styles.label}>คำอธิบาย (Description)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={desc}
                onChangeText={setDesc}
                placeholder="อธิบายเงื่อนไขการใช้คูปอง..."
                multiline
                textAlignVertical="top"
              />
              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>โค้ด (Code)</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ประเภทส่วนลด</Text>
                  <View style={styles.dropdownFake}>
                    <Text>{discountType}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ส่วนลด</Text>
                  <TextInput
                    style={styles.input}
                    value={discountAmount}
                    onChangeText={setDiscountAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ราคาขั้นต่ำ (THB)</Text>
                  <TextInput
                    style={styles.input}
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.rowGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>จำกัดการใช้ (ครั้ง)</Text>
                  <TextInput
                    style={styles.input}
                    value={usageLimit}
                    onChangeText={setUsageLimit}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>วันหมดอายุ</Text>
                  <TextInput
                    style={styles.input}
                    value={expDate}
                    onChangeText={setExpDate}
                    placeholder="mm/dd/yyyy"
                  />
                </View>
              </View>
              <Text style={styles.label}>สีไอคอนคูปอง</Text>
              <View style={styles.colorPicker}>
                {["#5E35B1", "#E91E63", "#4CAF50", "#FF9800", "#2196F3"].map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorCircle, { backgroundColor: c }]}
                      onPress={() => setColor(c)}
                    >
                      {color === c && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  ),
                )}
              </View>
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveCoupon}
                >
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.saveBtnText}>
                    {editingId ? "บันทึกแก้ไข" : "บันทึกคูปอง"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🗑️ Modal ยืนยันการลบ */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.warningIconBg}>
              <Ionicons name="trash-outline" size={32} color="#F44336" />
            </View>
            <Text style={styles.deleteModalTitle}>ยืนยันการลบ</Text>
            <Text style={styles.deleteModalText}>
              คุณแน่ใจหรือไม่ว่าต้องการลบคูปองนี้?{"\n"}
              ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
            </Text>
            <View style={styles.deleteActionRow}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={cancelDelete}
              >
                <Text style={styles.deleteCancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={confirmDeleteCoupon}
              >
                <Text style={styles.deleteConfirmBtnText}>ลบข้อมูล</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🟡 NEW: Modern Alert Modal แจ้งเตือนความผิดพลาด/กรอกข้อมูลไม่ครบ */}
      <Modal visible={alertVisible} animationType="fade" transparent>
        <View style={styles.modernAlertOverlay}>
          <View style={styles.modernAlertContent}>
            <View
              style={[
                styles.modernAlertIconBg,
                {
                  backgroundColor:
                    alertTitle === "สำเร็จ!" ? "#E8F5E9" : "#FFF8E1",
                },
              ]}
            >
              <Ionicons
                name={alertTitle === "สำเร็จ!" ? "checkmark-circle" : "warning"}
                size={40}
                color={alertTitle === "สำเร็จ!" ? "#4CAF50" : "#FFB300"}
              />
            </View>
            <Text style={styles.modernAlertTitle}>{alertTitle}</Text>
            <Text style={styles.modernAlertText}>{alertMessage}</Text>
            <TouchableOpacity
              style={[
                styles.modernAlertBtn,
                {
                  backgroundColor:
                    alertTitle === "สำเร็จ!" ? "#4CAF50" : "#5E35B1",
                },
              ]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.modernAlertBtnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  headerBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: "hidden",
  },
  headerCurve: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
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
  headerSub: { color: "#B0B2C3", fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20, paddingTop: 80, paddingBottom: 50 },
  createBtn: {
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  tableContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    elevation: 3,
  },
  tableHeaderSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  tableTitle: { fontSize: 14, fontWeight: "bold", color: "#333" },
  filterBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  filterText: { fontSize: 10, color: "#757575", marginRight: 5 },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingBottom: 10,
    marginBottom: 10,
  },
  thText: { fontSize: 10, color: "#9E9E9E", fontWeight: "bold" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    paddingVertical: 12,
  },
  td: { justifyContent: "center" },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  couponNameText: { fontSize: 11, fontWeight: "bold", color: "#333" },
  couponSubText: { fontSize: 9, color: "#9E9E9E", marginTop: 2 },
  codeBadge: {
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  codeBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "bold" },
  mainValueText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subValueText: {
    fontSize: 9,
    color: "#9E9E9E",
    textAlign: "center",
    marginTop: 2,
  },
  usageText: {
    fontSize: 9,
    color: "#333",
    textAlign: "center",
    marginBottom: 3,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#EEEEEE",
    borderRadius: 2,
    width: "80%",
    alignSelf: "center",
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: "bold" },
  actionBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  emptyText: {
    color: "#9E9E9E",
    textAlign: "center",
    marginVertical: 20,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "85%",
  },
  modalHeader: { marginBottom: 20 },
  modalTitle: { color: "#333", fontSize: 18, fontWeight: "bold" },
  modalSubTitle: { color: "#9E9E9E", fontSize: 12, marginTop: 2 },
  label: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FFF",
    color: "#333",
    height: 45,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 5,
    fontSize: 13,
  },
  textArea: { height: 80, paddingTop: 15 },
  dropdownFake: {
    backgroundColor: "#FFF",
    height: 45,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
  },
  rowGrid: { flexDirection: "row", justifyContent: "space-between" },
  colHalf: { width: "48%" },
  colorPicker: { flexDirection: "row", marginTop: 5, marginBottom: 25 },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 10,
  },
  cancelBtnText: { color: "#757575", fontSize: 13, fontWeight: "bold" },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  saveBtnText: { color: "#FFF", fontSize: 13, fontWeight: "bold" },

  // 🗑️ Delete Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  deleteModalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },
  warningIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 13,
    color: "#757575",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActionRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
    alignItems: "center",
  },
  deleteCancelBtnText: { color: "#757575", fontSize: 14, fontWeight: "bold" },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F44336",
    marginLeft: 8,
    alignItems: "center",
    elevation: 2,
  },
  deleteConfirmBtnText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  // 🟡 NEW: Modern Alert Modal Styles
  modernAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  modernAlertContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    elevation: 20,
  },
  modernAlertIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modernAlertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  modernAlertText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  modernAlertBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: "center",
    shadowOpacity: 0.2,
  },
  modernAlertBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

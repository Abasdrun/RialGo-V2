import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../supabase";

// 🟦 1. TypeScript Interface
interface ModalConfig {
  type?: "warning" | "success" | "error";
  title?: string;
  message?: string;
  confirmText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export default function AdminBroadcastScreen() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notiType, setNotiType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  // 🟦 2. Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: "warning",
    title: "",
    message: "",
    confirmText: "ตกลง",
    onConfirm: () => setModalVisible(false),
    showCancel: false,
  });

  useEffect(() => {
    const fetchUserCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setTotalUsers(count || 0);
    };
    fetchUserCount();
  }, []);

  const showAlert = (config: ModalConfig) => {
    setModalConfig({
      type: config.type || "warning",
      title: config.title || "แจ้งเตือน",
      message: config.message || "",
      confirmText: config.confirmText || "ตกลง",
      onConfirm: config.onConfirm || (() => setModalVisible(false)),
      showCancel: config.showCancel || false,
    });
    setModalVisible(true);
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert({
        type: "warning",
        title: "ข้อมูลไม่ครบ",
        message: "กรุณากรอกหัวข้อและรายละเอียดข้อความให้ครบ!",
      });
      return;
    }

    showAlert({
      type: "warning",
      title: "ยืนยันการส่งข้อความ",
      message: `ระบบจะส่งข้อความนี้ไปยังผู้ใช้งานทั้งหมด ${totalUsers.toLocaleString()} คน ทันที\nคุณแน่ใจหรือไม่?`,
      confirmText: "ส่งกระจายเสียง",
      showCancel: true,
      onConfirm: async () => {
        setModalVisible(false);
        try {
          setLoading(true);
          const { data: users, error: fetchError } = await supabase
            .from("profiles")
            .select("id");
          if (fetchError) throw fetchError;
          if (!users || users.length === 0) {
            showAlert({
              type: "error",
              title: "แจ้งเตือน",
              message: "ไม่พบผู้ใช้งานในระบบ",
            });
            return;
          }

          const notificationsToInsert = users.map((user) => ({
            user_id: user.id,
            title: title,
            message: message,
            type: notiType,
          }));

          const { error: insertError } = await supabase
            .from("notifications")
            .insert(notificationsToInsert);
          if (insertError) throw insertError;

          showAlert({
            type: "success",
            title: "สำเร็จ! 🎉",
            message: `ส่งข้อความหาผู้ใช้งานจำนวน ${users.length.toLocaleString()} คน เรียบร้อยแล้ว!`,
            onConfirm: () => {
              setModalVisible(false);
              setTitle("");
              setMessage("");
              router.back();
            },
          });
        } catch (error: any) {
          showAlert({
            type: "error",
            title: "เกิดข้อผิดพลาด",
            message: error.message,
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* 👑 Fixed Header Section */}
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerTopRow}>
            {/* แก้ไขส่วนการกดปุ่มย้อนกลับให้ชัดเจนขึ้น */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              style={styles.backBtnCircle}
            >
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitleCenter}>Admin</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.mainTitle}>ส่งข่าวสาร (Broadcast)</Text>
              <Text style={styles.subTitle}>
                ส่งการแจ้งเตือนไปยังผู้ใช้ทั้งหมด
              </Text>
            </View>

            <View style={styles.iconWrapper}>
              <View style={styles.iconBg}>
                <Ionicons name="volume-medium" size={28} color="#5E35B1" />
              </View>
            </View>

            <Text style={styles.userCountText}>
              ส่งการแจ้งเตือนให้ผู้ใช้ทั้งหมด{" "}
              <Text style={styles.highlightText}>
                {totalUsers.toLocaleString()} คน
              </Text>
            </Text>

            <Text style={styles.label}>หัวข้อการแจ้งเตือน (Title)</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น : ประกาศสำคัญ"
              placeholderTextColor="#9E9E9E"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>รายละเอียด (Message)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="พิมพ์ข้อความ...."
              placeholderTextColor="#9E9E9E"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>ประเภทการแจ้งเตือน</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeBox,
                  notiType === "info" && styles.typeActive,
                ]}
                onPress={() => setNotiType("info")}
              >
                <View
                  style={[styles.typeDot, { backgroundColor: "#42A5F5" }]}
                />
                <Text
                  style={[
                    styles.typeText,
                    notiType === "info" && styles.typeTextActive,
                  ]}
                >
                  ทั่วไป
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBox,
                  notiType === "success" && styles.typeActive,
                ]}
                onPress={() => setNotiType("success")}
              >
                <View
                  style={[styles.typeDot, { backgroundColor: "#4CAF50" }]}
                />
                <Text
                  style={[
                    styles.typeText,
                    notiType === "success" && styles.typeTextActive,
                  ]}
                >
                  สำเร็จ/โปรโมชั่น
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBox,
                  notiType === "warning" && styles.typeActive,
                ]}
                onPress={() => setNotiType("warning")}
              >
                <View
                  style={[styles.typeDot, { backgroundColor: "#FFCA28" }]}
                />
                <Text
                  style={[
                    styles.typeText,
                    notiType === "warning" && styles.typeTextActive,
                  ]}
                >
                  แจ้งเตือน
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBox,
                  notiType === "danger" && styles.typeActive,
                ]}
                onPress={() => setNotiType("danger")}
              >
                <View
                  style={[styles.typeDot, { backgroundColor: "#EF5350" }]}
                />
                <Text
                  style={[
                    styles.typeText,
                    notiType === "danger" && styles.typeTextActive,
                  ]}
                >
                  ด่วน/สำคัญ
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBanner}>
              <Ionicons
                name="warning-outline"
                size={20}
                color="#F57F17"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.warningText}>
                การส่ง Broadcast จะส่งไปยังผู้ใช้งานทั้งหมดทันที
                ไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลก่อนส่ง
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  loading && { backgroundColor: "#9E9E9E" },
                ]}
                onPress={handleBroadcast}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="volume-medium"
                      size={16}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.sendBtnText}>
                      ส่งข่าวสาร (Broadcast Now)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🟦 Modern Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalIconCircle,
                modalConfig.type === "success"
                  ? { backgroundColor: "#E8F5E9" }
                  : modalConfig.type === "error"
                    ? { backgroundColor: "#FFEBEE" }
                    : { backgroundColor: "#FFF8E1" },
              ]}
            >
              <Ionicons
                name={
                  modalConfig.type === "success"
                    ? "checkmark-circle"
                    : modalConfig.type === "error"
                      ? "alert-circle"
                      : "warning"
                }
                size={40}
                color={
                  modalConfig.type === "success"
                    ? "#4CAF50"
                    : modalConfig.type === "error"
                      ? "#EF5350"
                      : "#FFB300"
                }
              />
            </View>

            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>

            <View style={styles.modalActionRow}>
              {modalConfig.showCancel && (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  modalConfig.type === "error" && {
                    backgroundColor: "#EF5350",
                  },
                  !modalConfig.showCancel
                    ? { flex: 1, width: "100%" }
                    : { flex: 1 },
                ]}
                onPress={modalConfig.onConfirm}
              >
                <Text style={styles.modalConfirmText}>
                  {modalConfig.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },

  // ปรับปรุง Header ให้ Z-Index สูงสุดและจัดระเบียบใหม่
  headerBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 20,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtnCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20, // มั่นใจว่าอยู่บนสุด
  },
  headerTitleCenter: { color: "#FFF", fontSize: 18, fontWeight: "bold" },

  scrollContent: { padding: 20, paddingTop: 150, paddingBottom: 50 },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 25,
    padding: 25,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  cardHeader: { marginBottom: 20 },
  mainTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  subTitle: { fontSize: 12, color: "#757575", marginTop: 4 },
  iconWrapper: { alignItems: "center", marginBottom: 10 },
  iconBg: {
    backgroundColor: "#EBE4FF",
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  userCountText: {
    textAlign: "center",
    fontSize: 12,
    color: "#757575",
    marginBottom: 25,
  },
  highlightText: { color: "#5E35B1", fontWeight: "bold" },
  label: {
    color: "#333",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FFF",
    color: "#333",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 14,
    marginBottom: 15,
  },
  textArea: { height: 100, paddingTop: 15 },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  typeBox: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 10,
  },
  typeActive: { backgroundColor: "#F3E5F5", borderColor: "#5E35B1" },
  typeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  typeText: { color: "#555", fontSize: 12, fontWeight: "bold" },
  typeTextActive: { color: "#5E35B1" },
  warningBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#FFD54F",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: "flex-start",
  },
  warningText: { flex: 1, color: "#F57F17", fontSize: 11, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelBtn: {
    flex: 0.35,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: "center",
    marginRight: 10,
  },
  cancelBtnText: { color: "#757575", fontSize: 14, fontWeight: "bold" },
  sendBtn: {
    flex: 0.65,
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingVertical: 14,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 25,
  },
  modalActionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalCancelText: { color: "#757575", fontWeight: "bold" },
  modalConfirmBtn: {
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#5E35B1",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 120,
  },
  modalConfirmText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});

import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { mutationQueueCount } from '@/src/services/offline-queue';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const refresh = () => void mutationQueueCount().then(setPending);
    refresh(); const timer = setInterval(refresh, 3000);
    const unsubscribe = NetInfo.addEventListener((state) => { setOffline(state.isConnected === false || state.isInternetReachable === false); refresh(); });
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);
  if (!offline && !pending) return null;
  return <View style={styles.banner}><Ionicons name={offline ? "cloud-offline-outline" : "sync-outline"} size={16} color="#7C2D12" /><Text style={styles.text}>{pending ? `${pending} thay đổi đang chờ đồng bộ${offline ? ' · Bạn đang offline' : ''}` : 'Bạn đang offline · Đang hiển thị dữ liệu đã lưu'}</Text></View>;
}
const styles = StyleSheet.create({ banner: { minHeight: 34, paddingHorizontal: 12, backgroundColor: '#FFEDD5', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, text: { color: '#7C2D12', fontSize: 11, fontWeight: '700' } });

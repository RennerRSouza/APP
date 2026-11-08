import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import { pickImage } from '../../core/gallery/pickImage';
import { RootStackParamList } from '../navigation/types';
import { useHistorico } from '../hooks/useHistorico';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const itemsHistorico = useHistorico();
  const contagensRecentes = itemsHistorico.slice(0, 3);

  useEffect(() => {
    async function solicitarPermissoesIniciais() {
      try {
        if (!hasPermission) {
          await requestPermission();
        }

        if (Platform.OS === 'android') {
          const locationPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (!locationPermission) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          }
        } else {
          Geolocation.requestAuthorization();
        }
      } catch (error) {
        console.warn('Erro ao solicitar permissões iniciais:', error);
      }
    }

    solicitarPermissoesIniciais();
  }, [hasPermission, requestPermission]);

  const handleOpenGallery = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        navigation.navigate('Resultado', { imageUri: uri });
      }
    } catch (error) {
      console.error('Erro ao abrir galeria:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Gestão de Ativos Inteligente</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nova Contagem</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>Câmera</Text>
            <Text style={styles.actionDesc}>Contagem em tempo real</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={handleOpenGallery}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionTitle}>Galeria</Text>
            <Text style={styles.actionDesc}>Analisar foto salva</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleNoMargin}>Últimas Contagens</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Historico')}>
            <Text style={styles.linkText}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        {contagensRecentes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma contagem salva ainda.</Text>
        ) : (
          contagensRecentes.map((item) => {
            const dataFormatada = new Date(item.criadoEm).toLocaleString();
            
            const local = item.endereco 
              ? item.endereco 
              : (item.latitude && item.longitude ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` : 'Local não identificado');
            
            const resumoItens = Object.entries(item.porClasse)
              .map(([classe, qtd]) => `${qtd}x ${classe.replace(/_/g, ' ')}`)
              .join(', ');

            const textoFinal = `Total: ${item.totalConfirmado} (${resumoItens})`;

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>{dataFormatada}</Text>
                  <Text style={styles.historyLocal} numberOfLines={1}>📍 {local}</Text>
                  <Text style={styles.historyItems} numberOfLines={1}>{textoFinal}</Text>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, marginTop: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24 },
  statusBox: { flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#C8E6C9' },
  statusIcon: { fontSize: 24, marginRight: 12 },
  statusTextContainer: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  statusSubtitle: { fontSize: 12, color: '#388E3C', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  emptyText: { color: '#999', fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon: { fontSize: 32, marginBottom: 12 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  actionDesc: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 },
  historyCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 12, color: '#999', marginBottom: 4 },
  historyLocal: { fontSize: 14, fontWeight: '500', color: '#1A1A1A', marginBottom: 4 },
  historyItems: { fontSize: 14, color: '#0056b3', fontWeight: '600' },
  linkText: { color: '#007AFF', fontWeight: 'bold' }
});
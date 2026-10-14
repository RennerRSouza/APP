import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar,
  Image,
  Alert
} from 'react-native';
import { CameraScanner } from '../components/CameraScanner';
import { GalleryService } from '../../core/media/GalleryService';

export function HomeScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleOpenGallery = async () => {
    const result = await GalleryService.openGallery();
    if (result && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (uri) setPreviewImage(uri);
    }
  };

  const handlePhotoCaptured = (imagePath: string) => {
    setShowCamera(false); // Fecha a câmera
    setPreviewImage(imagePath); // Abre o modo de pré-visualização
  };

  const handleAnalyze = () => {
    Alert.alert("Análise Iniciada", "Na próxima Sprint, o modelo YOLO será executado aqui!");
  };

  // Tela de previsualização da imagem capturada ou selecionada
  if (previewImage) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Revisão da Imagem</Text>
          </View>

          <View style={styles.previewFooter}>
            <TouchableOpacity 
              style={[styles.previewButton, styles.buttonDiscard]} 
              onPress={() => setPreviewImage(null)}
            >
              <Text style={styles.buttonDiscardText}>Descartar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.previewButton, styles.buttonAnalyze]} 
              onPress={handleAnalyze}
            >
              <Text style={styles.buttonText}>Contar Itens</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // TELA PRINCIPAL (DASHBOARD)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Gestão de Ativos Inteligente</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        </View>

        {/* Ações */}
        <Text style={styles.sectionTitle}>Nova Contagem</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={() => setShowCamera(true)}>
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

        {/* Histórico */}
        <Text style={styles.sectionTitle}>Últimas Contagens</Text>
        <View style={styles.historyCard}>
          <View style={styles.historyInfo}>
            <Text style={styles.historyDate}>01 Out 2026 - 09:30</Text>
            <Text style={styles.historyLocal}>📍 Galpão Principal</Text>
            <Text style={styles.historyItems}>15x Mesa Bistrô, 4x Gradil</Text>
          </View>
        </View>

      </ScrollView>

      {/* Componente de Scanner de Câmera */}
      {showCamera && (
        <CameraScanner 
          onClose={() => setShowCamera(false)} 
          onPhotoCaptured={handlePhotoCaptured} 
        />
      )}
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
  
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1, width: '100%' },
  previewHeader: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  previewTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  previewFooter: { position: 'absolute', bottom: 40, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between' },
  previewButton: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 8 },
  buttonDiscard: { backgroundColor: '#333' },
  buttonDiscardText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  buttonAnalyze: { backgroundColor: '#0056b3' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
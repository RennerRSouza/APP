import React from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBar
} from 'react-native';

export function HomeScreen() {
  const contagensRecentes = [
    { id: '1', data: '01 Out 2026 - 09:30', local: 'Galpão Principal', itens: '10x Mesas, 8x Gradil' },
    { id: '2', data: '29 Set 2026 - 16:45', local: 'Local de Eventos', itens: '40x Mesas, 42x Gradil' },
    { id: '3', data: '27 Set 2026 - 11:15', local: 'Galpão Principal', itens: '50x Mesas, 50x Gradil' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Cabeçalho / Perfil */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Gestão de Ativos</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        </View>

        {/* Ações Principais (Épico 2) */}
        <Text style={styles.sectionTitle}>Nova Contagem</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>Câmera</Text>
            <Text style={styles.actionDesc}>Contagem com nova foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionTitle}>Galeria</Text>
            <Text style={styles.actionDesc}>Analisar foto salva</Text>
          </TouchableOpacity>
        </View>

        {/* Histórico Recente (Épico 6) */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Últimas Contagens</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        {contagensRecentes.map(item => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyDate}>{item.data}</Text>
              <Text style={styles.historyLocal}>📍 {item.local}</Text>
              <Text style={styles.historyItems}>{item.itens}</Text>
            </View>
            <View style={styles.historyBadge}>
              <Text style={styles.badgeText}>Concluído</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scroll: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  statusBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#388E3C',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  actionDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#0056b3',
    fontWeight: '500',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  historyLocal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  historyItems: {
    fontSize: 14,
    color: '#0056b3',
    fontWeight: '600',
  },
  historyBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#0056b3',
    fontWeight: '600',
  },
});
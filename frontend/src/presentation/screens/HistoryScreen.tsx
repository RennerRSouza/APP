import React from 'react';
import {FlatList, Image, StyleSheet, Text, View, TouchableOpacity, Linking} from 'react-native';
import {theme} from '../../core/theme';
import {useHistorico} from '../hooks/useHistorico';

export function HistoryScreen() {
  const items = useHistorico();

  // Função para abrir as coordenadas direto no app do Google Maps
  const abrirNoMaps = (lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch(() => console.log('Erro ao abrir o Google Maps'));
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.muted}>Nenhuma contagem salva ainda.</Text>}
      renderItem={({item}) => (
        <View style={styles.card}>
          <Image source={{uri: item.imageUri}} style={styles.thumb} />
          <View style={styles.flex}>
            <Text style={styles.total}>{item.totalConfirmado}</Text>
            <Text style={styles.muted}>
              {new Date(item.criadoEm).toLocaleString()} • modelo {item.modeloVersao}
            </Text>

            {/* Exibe Endereço + Coordenadas e permite clique para abrir o Maps */}
            {(item.endereco || (item.latitude && item.longitude)) && (
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => abrirNoMaps(item.latitude, item.longitude)}
                style={styles.botaoLocalizacao}
              >
                <Text style={styles.localizacao} numberOfLines={3}>
                  {item.endereco ? `📍 ${item.endereco}\n` : ''}
                  {item.latitude && item.longitude ? `🗺️ ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : ''}
                </Text>
              </TouchableOpacity>
            )}

            {item.totalConfirmado !== item.totalDetectado && (
              <Text style={styles.muted}>corrigido (modelo: {item.totalDetectado})</Text>
            )}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {padding: theme.spacing.md, gap: theme.spacing.sm},
  flex: {flex: 1},
  card: {flexDirection: 'row', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.sm},
  thumb: {width: 72, height: 72, borderRadius: theme.radius.sm},
  total: {color: theme.colors.text, fontSize: theme.font.title, fontWeight: '700'},
  muted: {color: theme.colors.muted, fontSize: 13},
  botaoLocalizacao: {
    marginTop: 4,
    paddingVertical: 2,
  },
  localizacao: {
    color: '#63B3ED',
    fontSize: 11, 
    fontStyle: 'italic'
  }
});
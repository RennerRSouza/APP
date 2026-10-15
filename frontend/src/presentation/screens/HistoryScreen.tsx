import React from 'react';
import {FlatList, Image, StyleSheet, Text, View} from 'react-native';
import {theme} from '../../core/theme';
import {useHistorico} from '../hooks/useHistorico';

export function HistoryScreen() {
  const items = useHistorico();
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
});

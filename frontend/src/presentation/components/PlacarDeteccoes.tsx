import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ContagemResultado = {
  porClasse: Record<string, number>;
  total: number;
  duracaoMs: number;
};

interface PlacarProps {
  resultado: ContagemResultado | null;
}

export const PlacarDeteccoes: React.FC<PlacarProps> = ({ resultado }) => {
  if (!resultado || resultado.total === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Resultados (Offline)</Text>
      
      {Object.entries(resultado.porClasse).map(([classe, quantidade]) => (
        <View key={classe} style={styles.linhaClasse}>
          <Text style={styles.textoClasse}>{classe.toUpperCase()}</Text>
          <Text style={styles.textoQuantidade}>{quantidade}</Text>
        </View>
      ))}
      
      <View style={styles.divisor} />
      
      <View style={styles.linhaClasse}>
        <Text style={styles.textoTotal}>TOTAL</Text>
        <Text style={styles.textoTotal}>{resultado.total}</Text>
      </View>
      
      <Text style={styles.textoTempo}>Latência: {resultado.duracaoMs.toFixed(1)} ms</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 16,
    borderRadius: 12,
    minWidth: 160,
    zIndex: 100,
  },
  titulo: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  linhaClasse: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  textoClasse: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  textoQuantidade: {
    color: '#48BB78',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divisor: {
    height: 1,
    backgroundColor: '#4A5568',
    marginVertical: 8,
  },
  textoTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textoTempo: {
    color: '#F6E05E',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
  },
});
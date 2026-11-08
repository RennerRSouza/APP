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
      <Text style={styles.titulo}>Resultados Detalhados</Text>
      
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
    backgroundColor: '#1A202C',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
  },
  titulo: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  linhaClasse: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginVertical: 10,
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
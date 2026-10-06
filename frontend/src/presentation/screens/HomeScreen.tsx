import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>YOLO Counter - Câmera em Breve</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
});
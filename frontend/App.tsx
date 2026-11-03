import React, { useEffect, useState } from 'react';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { runMigrations } from './src/core/database/database';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(() => setDbReady(true))
      .catch((e) => console.error("Erro ao criar o banco:", e));
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}> 
        <ActivityIndicator size="large" />
        <Text>Preparando banco offline...</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {theme} from '../../core/theme';
import {HomeScreen} from '../screens/HomeScreen';
import {CameraScreen} from '../screens/CameraScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {ResultScreen} from '../screens/ResultScreen';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {backgroundColor: theme.colors.surface},
          headerTintColor: theme.colors.text,
          contentStyle: {backgroundColor: theme.colors.bg},
          headerShown: false
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{title: 'Capturar Imagem', headerShown: true}} />
        <Stack.Screen name="Resultado" component={ResultScreen} options={{title: 'Resultado da Contagem', headerShown: true}} />
        <Stack.Screen name="Historico" component={HistoryScreen} options={{title: 'Histórico', headerShown: true}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {theme} from '../../core/theme';
import {CameraScreen} from '../screens/CameraScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {ResultScreen} from '../screens/ResultScreen';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: theme.colors.surface},
          headerTintColor: theme.colors.text,
          contentStyle: {backgroundColor: theme.colors.bg},
        }}>
        <Stack.Screen name="Camera" component={CameraScreen} options={{title: 'Contar objetos'}} />
        <Stack.Screen name="Resultado" component={ResultScreen} options={{title: 'Resultado'}} />
        <Stack.Screen name="Historico" component={HistoryScreen} options={{title: 'Histórico'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

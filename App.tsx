import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from './src/types/types';

// Importação das telas

import { HomeScreen } from './src/screens/HomeScreen';
import { ImportInventoryScreen } from './src/screens/ImportInventoryScreen';
import { InventoryDetailScreen } from './src/screens/InventoryDetailScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { ManualInventoryScreen } from './src/screens/ManualInventoryScreen';
import { ReportDetailScreen } from './src/screens/ReportDetailScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <>
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0A0A0F" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'slide_from_right',
        }}
      >
        {/* Telas principais */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />

        {/*  Detalhes do item */}
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />

        {/* Telas de relatório */}
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />

        {/* Telas de criação/importação */}
        <Stack.Screen name="ImportInventory" component={ImportInventoryScreen} />
        <Stack.Screen name="ManualInventory" component={ManualInventoryScreen} />

        {/* Telas de configuração */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>

    {/* 3. Componente Toast */}

    <Toast />

    </>
  );
}

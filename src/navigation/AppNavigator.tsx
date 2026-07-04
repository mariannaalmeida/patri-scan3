// src/navigation/AppNavigator.tsx

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { colors } from '../styles/theme';
import { RootStackParamList } from '../types/types';

// Importação das telas

import { HomeScreen } from '../screens/HomeScreen';
import { ImportInventoryScreen } from '../screens/ImportInventoryScreen';
import { InventoryDetailScreen } from '../screens/InventoryDetailScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { ManualInventoryScreen } from '../screens/ManualInventoryScreen';
import { ReportDetailScreen } from '../screens/ReportDetailScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
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
        {/* Telas de criação */}
        <Stack.Screen name="ImportInventory" component={ImportInventoryScreen} />
        <Stack.Screen name="ManualInventory" component={ManualInventoryScreen} />
        {/* Telas de configuração */}
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

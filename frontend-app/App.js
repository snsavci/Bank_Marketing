// File: frontend-app/App.js
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import PredictionScreen from './src/PredictionScreen'; 

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <PredictionScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
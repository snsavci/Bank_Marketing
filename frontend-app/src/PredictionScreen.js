// File: frontend-app/src/PredictionScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// 🚨 ÖNEMLİ: Bu URL'yi, API'nizin çalıştığı yerel IP adresinizle güncelleyin!
// Yerel ağda çalıştığı için localhost yerine IP adresi kullanılmalıdır. (Örn: http://192.168.1.100:8000/predict)
const API_URL = 'http://127.0.0.1:8000/predict'; 

// Tüm gerekli inputlar (FastAPI'deki CustomerInput modeline uygun)
const initialFormData = {
    age: '40', job: 'management', marital: 'married', education: 'secondary',
    default: 'no', balance: '1000', housing: 'yes', loan: 'no',
    contact: 'cellular', day: '15', month: 'may', campaign: '2',
    pdays: '-1', previous: '0', poutcome: 'unknown',
};

const PredictionScreen = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [predictionResult, setPredictionResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handlePredict = async () => {
        setLoading(true);
        setPredictionResult(null);

        // API için veri tiplerini hazırlama (Sayısal alanları string'den sayıya çevirme)
        const requestData = {
            ...formData,
            age: parseInt(formData.age),
            balance: parseFloat(formData.balance),
            day: parseInt(formData.day),
            campaign: parseInt(formData.campaign),
            pdays: parseInt(formData.pdays),
            previous: parseInt(formData.previous),
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Status: ${response.status}. Details: ${errorText}`);
            }

            const result = await response.json();
            setPredictionResult(result);

        } catch (error) {
            Alert.alert("Tahmin Hatası", `API bağlantısı başarısız oldu: ${error.message}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Bank Marketing Tahmin Uygulaması 🧠</Text>

            {/* --- Ana Girdiler (Feature Importance'a göre öncelikli) --- */}
            <Text style={styles.label}>Yaş (Age):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={formData.age} onChangeText={(text) => handleInputChange('age', text)} />

            <Text style={styles.label}>Bakiye (Balance €):</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={formData.balance} onChangeText={(text) => handleInputChange('balance', text)} />

            <Text style={styles.label}>Meslek (Job):</Text>
            <Picker selectedValue={formData.job} onValueChange={(itemValue) => handleInputChange('job', itemValue)}>
                {['management', 'technician', 'blue-collar', 'admin.', 'services', 'retired', 'self-employed', 'unemployed', 'housemaid', 'student', 'entrepreneur', 'unknown'].map(j => <Picker.Item key={j} label={j} value={j} />)}
            </Picker>
            
            <Text style={styles.label}>Konut Kredisi (Housing Loan):</Text>
            <Picker selectedValue={formData.housing} onValueChange={(itemValue) => handleInputChange('housing', itemValue)}>
                <Picker.Item label="Yes" value="yes" /><Picker.Item label="No" value="no" />
            </Picker>

            <Text style={styles.label}>Önceki Sonuç (Poutcome):</Text>
            <Picker selectedValue={formData.poutcome} onValueChange={(itemValue) => handleInputChange('poutcome', itemValue)}>
                {['unknown', 'failure', 'other', 'success'].map(p => <Picker.Item key={p} label={p} value={p} />)}
            </Picker>
            
            {/* Diğer Gerekli Girdiler */}
            <Text style={styles.label}>Medeni Durum (Marital):</Text>
            <Picker selectedValue={formData.marital} onValueChange={(itemValue) => handleInputChange('marital', itemValue)}>
                {['married', 'single', 'divorced'].map(m => <Picker.Item key={m} label={m} value={m} />)}
            </Picker>

            <View style={styles.buttonContainer}>
                <Button title={loading ? "Tahmin Ediliyor..." : "Tahmini Yap"} onPress={handlePredict} disabled={loading} color="#2196F3" />
            </View>

            {/* --- Sonuç Kutusu --- */}
            {predictionResult && (
                <View style={[styles.resultBox, {backgroundColor: predictionResult.subscription_predicted === 'Yes' ? '#e8f5e9' : '#ffebee'}]}>
                    <Text style={styles.resultTitle}>Tahmin Sonucu:</Text>
                    <Text style={styles.resultText}>
                        Müşterinin Abone Olma Durumu: 
                        <Text style={{fontWeight: 'bold', color: predictionResult.subscription_predicted === 'Yes' ? '#4CAF50' : '#F44336', fontSize: 18}}>
                            {" " + predictionResult.subscription_predicted}
                        </Text>
                    </Text>
                    <Text style={styles.resultProb}>
                        Abone Olma Olasılığı: <Text style={{fontWeight: 'bold'}}>{(predictionResult.probability_of_yes * 100).toFixed(2)}%</Text>
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#f9f9f9', paddingTop: 50 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1976D2' },
    label: { fontSize: 14, marginTop: 10, marginBottom: 3, fontWeight: '500', color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 5, backgroundColor: 'white' },
    buttonContainer: { marginTop: 30, marginBottom: 30 },
    resultBox: { marginTop: 20, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#cfd8dc' },
    resultTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
    resultText: { fontSize: 15 },
    resultProb: { fontSize: 15, marginTop: 5 },
});

export default PredictionScreen;
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator, ImageBackground } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';

// 🚨 API connection URL - Using localhost for web browser testing
const API_URL = 'http://127.0.0.1:8000/predict';

// Background image: Using a placeholder URL for abstract navy texture
const BACKGROUND_IMAGE_URL = 'https://placehold.co/1920x1080/0A1A33/0A1A33?text=';

// Helper function to capitalize the first letter
const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Initial state for all required inputs (matching FastAPI CustomerInput model)
const initialFormData = {
    age: '', job: null, marital: null, education: 'secondary',
    default: 'no', balance: '', housing: null, loan: 'no',
    contact: 'cellular', day: '15', month: 'may', campaign: '2',
    pdays: '-1', previous: '0', poutcome: null,
};

const PredictionScreen = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [predictionResult, setPredictionResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (name, value) => {
        // Input validation for numeric fields
        if (name === 'age' || name === 'balance' || name === 'day' || name === 'campaign' || name === 'pdays' || name === 'previous') {
            const numericValue = value.replace(/[^0-9-]/g, '');
            setFormData({ ...formData, [name]: numericValue });
            return;
        }
        // Handle null values for pickers (placeholder selection)
        setFormData({ ...formData, [name]: value });
    };

    const handlePredict = async () => {
        // Client-side validation
        if (!formData.age || !formData.balance || isNaN(parseInt(formData.age)) || parseInt(formData.age) <= 0) {
            Alert.alert("Error", "Please enter valid Age and Balance values.");
            return;
        }
        // Validate picker fields
        if (!formData.job || !formData.housing || !formData.marital || !formData.poutcome) {
            Alert.alert("Error", "Please select all required fields (Job, Housing Loan, Marital Status, Previous Outcome).");
            return;
        }

        setLoading(true);
        setPredictionResult(null);

        // Prepare data types for API (Convert strings to numbers and remove null values)
        const requestData = {
            age: parseInt(formData.age),
            job: formData.job,
            marital: formData.marital,
            education: formData.education || 'secondary',
            default: formData.default || 'no',
            balance: parseFloat(formData.balance),
            housing: formData.housing,
            loan: formData.loan || 'no',
            contact: formData.contact || 'cellular',
            day: parseInt(formData.day),
            month: formData.month || 'may',
            campaign: parseInt(formData.campaign),
            pdays: parseInt(formData.pdays),
            previous: parseInt(formData.previous),
            poutcome: formData.poutcome,
        };
        
        // Remove any null/undefined values and log for debugging
        Object.keys(requestData).forEach(key => {
            if (requestData[key] === null || requestData[key] === undefined) {
                console.warn(`Warning: ${key} is null/undefined`);
            }
        });
        
        console.log("Sending request data:", JSON.stringify(requestData, null, 2));
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error Response:", errorText);
                // Try to parse as JSON for better error message
                try {
                    const errorJson = JSON.parse(errorText);
                    let errorMessage = errorJson.detail || errorText;
                    if (errorJson.errors && Array.isArray(errorJson.errors)) {
                        errorMessage = errorJson.message + "\n\n" + errorJson.errors.join("\n");
                    }
                    Alert.alert("Validation Error", errorMessage);
                } catch {
                    Alert.alert("API Error", `Status: ${response.status}\n${errorText}`);
                }
                // Throw error if API responds with non-2xx status (e.g., 400, 500)
                throw new Error(`API Status: ${response.status}. Details: ${errorText}`);
            }

            const result = await response.json();
            setPredictionResult(result);

        } catch (error) {
            // Error handling for connection issues (connection refused, timeout)
            Alert.alert("Connection Error", `Could not reach API. Error: ${error.message}. Please ensure the FastAPI server is running in the Anaconda Prompt.`);
            console.error("API Call Error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        // ImageBackground component wraps the entire screen
        <ImageBackground source={{ uri: BACKGROUND_IMAGE_URL }} style={styles.background}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Main Content CARD container */}
                <View style={styles.cardContainer}> 

                    {/* --- HEADER --- */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>CUSTOMER SUBSCRIPTION PREDICTION</Text>
                        <Text style={styles.subtitle}>Term Deposit Offer Analysis</Text>
                    </View>

                    {/* --- Age and Balance (Inputs) --- */}
                    <Text style={styles.label}>
                        <FontAwesome5 name="user-tie" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Age
                    </Text>
                    <TextInput style={styles.input} keyboardType="numeric" placeholder="ex: 40" placeholderTextColor="#9CA3AF" value={formData.age} onChangeText={(text) => handleInputChange('age', text)} />

                    <Text style={styles.label}>
                        <FontAwesome5 name="coins" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Balance (€)
                    </Text>
                    <TextInput style={styles.input} keyboardType="numeric" placeholder="ex: 1000" placeholderTextColor="#9CA3AF" value={formData.balance} onChangeText={(text) => handleInputChange('balance', text)} />

                    {/* --- Job (Picker) --- */}
                    <Text style={styles.label}>
                        <FontAwesome5 name="briefcase" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Job
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={formData.job} onValueChange={(itemValue) => handleInputChange('job', itemValue)} style={styles.pickerStyle}>
                            <Picker.Item label="Select Job" value={null} />
                            {/* Remove period from "admin." label */}
                            {['management', 'technician', 'blue-collar', 'admin.', 'services', 'retired', 'self-employed', 'unemployed', 'housemaid', 'student', 'entrepreneur', 'unknown'].map(j => <Picker.Item key={j} label={capitalize(j.replace('.', ''))} value={j} />)}
                        </Picker>
                    </View>

                    {/* --- Housing Loan (Picker) --- */}
                    <Text style={styles.label}>
                        <FontAwesome5 name="home" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Housing Loan
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={formData.housing} onValueChange={(itemValue) => handleInputChange('housing', itemValue)} style={styles.pickerStyle}>
                            <Picker.Item label="Select Housing Loan" value={null} />
                            <Picker.Item label="Yes" value="yes" /><Picker.Item label="No" value="no" />
                        </Picker>
                    </View>

                    {/* --- Marital Status (Picker) --- */}
                    <Text style={styles.label}>
                        <FontAwesome5 name="heart" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Marital Status
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={formData.marital} onValueChange={(itemValue) => handleInputChange('marital', itemValue)} style={styles.pickerStyle}>
                            <Picker.Item label="Select Marital Status" value={null} />
                            {['married', 'single', 'divorced'].map(m => <Picker.Item key={m} label={capitalize(m)} value={m} />)}
                        </Picker>
                    </View>

                    {/* --- Previous Outcome (Picker) --- */}
                    <Text style={styles.label}>
                        <FontAwesome5 name="history" size={16} color={styles.altin.color} style={styles.iconStyle} /> 
                        Previous Outcome
                    </Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={formData.poutcome} onValueChange={(itemValue) => handleInputChange('poutcome', itemValue)} style={styles.pickerStyle}>
                            <Picker.Item label="Select Previous Outcome" value={null} />
                            {['unknown', 'failure', 'other', 'success'].map(p => <Picker.Item key={p} label={capitalize(p)} value={p} />)}
                        </Picker>
                    </View>

                    {/* Hidden Inputs for API (Not displayed to user) */}
                    <View style={{ display: 'none' }}> 
                        <TextInput value={formData.day} onChangeText={(text) => handleInputChange('day', text)} />
                        <TextInput value={formData.campaign} onChangeText={(text) => handleInputChange('campaign', text)} />
                        <TextInput value={formData.pdays} onChangeText={(text) => handleInputChange('pdays', text)} />
                        <TextInput value={formData.previous} onChangeText={(text) => handleInputChange('previous', text)} />
                    </View>

                    {/* --- Predict Button --- */}
                    <View style={styles.buttonContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={styles.altin.color} />
                        ) : (
                            <Button
                                title={"PREDICT SUBSCRIPTION"}
                                onPress={handlePredict}
                                disabled={loading}
                                color={styles.altin.color} 
                            />
                        )}
                    </View>

                    {/* --- Result Box --- */}
                    {predictionResult && (
                        <View style={[styles.resultBox, {
                            borderLeftColor: styles.altin.color, // Gold border
                        }]}>
                            <Text style={styles.resultTitle}>PREDICTION ANALYSIS</Text>

                            <Text style={styles.resultText}>
                                Subscription Status:
                                <Text style={{ fontWeight: 'bold', color: predictionResult.subscription_predicted === 'Yes' ? styles.success.color : styles.danger.color, fontSize: 18 }}>
                                    {" " + capitalize(predictionResult.subscription_predicted)}
                                </Text>
                            </Text>
                            <Text style={styles.resultProb}>
                                Probability: <Text style={{ fontWeight: 'normal', color: styles.mainNavy.color }}>{(predictionResult.probability_of_yes * 100).toFixed(2)}%</Text>
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </ImageBackground>
    );
};

// --- Styles (Premium Banking Theme) ---
const styles = StyleSheet.create({
    // Color Palette Definitions
    mainNavy: { color: '#0A1A33' }, // Main Navy (Trust)
    altin: { color: '#CFAF70' },     // Gold Accent
    success: { color: '#2ECC71' },  // Green Success
    danger: { color: '#E74C3C' },   // Red Danger
    
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        // Sets the background color (used for the placeholder image)
        backgroundColor: '#0A1A33', 
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: 40, 
        paddingHorizontal: 20,
        minHeight: '100%',
    },
    cardContainer: {
        width: '100%',
        maxWidth: 600, 
        padding: 30,
        backgroundColor: '#FFFFFF', // Form Card (White)
        borderRadius: 15,
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)', // Shadow for depth
        elevation: 10,
    },
    // Header Styles
    titleContainer: {
        marginBottom: 30,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#D0D0D0',
        alignItems: 'center', // Center alignment for text block
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0A1A33', 
        letterSpacing: 0.5,
        textTransform: 'uppercase', 
    },
    subtitle: {
        fontSize: 18,
        color: '#CFAF70', // Gold accent
        marginTop: 5,
    },
    // Form Elements Styles
    label: {
        fontSize: 15,
        marginTop: 24, 
        marginBottom: 5,
        fontWeight: '600',
        color: '#0A1A33', 
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#CFAF70', // Gold Border
        padding: 14,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        fontSize: 16,
        color: '#1E293B',
        height: 48, // Consistent height
    },
    pickerContainer: {
        borderWidth: 1.5,
        borderColor: '#CFAF70', // Gold Border
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
        overflow: 'hidden',
    },
    pickerStyle: {
        height: 48,
        padding: 0,
        margin: 0,
    },
    // Button Style
    buttonContainer: {
        marginTop: 40,
        marginBottom: 50,
        borderRadius: 10,
        overflow: 'hidden',
    },
    // Result Box Styles
    resultBox: {
        marginTop: 32,
        padding: 22,
        borderRadius: 12,
        borderLeftWidth: 4, 
        borderLeftColor: '#CFAF70', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
        elevation: 5,
        backgroundColor: '#FFFFFF',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold', 
        marginBottom: 10,
        color: '#0A1A33', 
    },
    resultText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#0A1A33',
    },
    resultProb: {
        fontSize: 18,
        marginTop: 5,
        fontWeight: 'normal', // Ensure probability number is not bold
        color: '#0A1A33', 
    },
    iconStyle: {
        marginRight: 8,
    }
});

export default PredictionScreen;
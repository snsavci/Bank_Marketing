# Bank Marketing - Term Deposit Prediction

This project is a machine learning application that predicts bank customers' term deposit subscriptions. It includes a React Native/Expo frontend and a FastAPI backend.

## 📁 Project Structure

```
Bank_Marketing/
├── backend-api/ # FastAPI backend service
│ ├── api.py # Main API file
│ ├── bank_marketing_rf_model.pkl # Trained model
│ ├── feature_cols.json # Feature columns
│ ├── optimal_threshold.json # Optimal threshold value
│ └── requirements.txt # Python dependencies
├── frontend-app/ # React Native/Expo frontend
│ ├── App.js # Main application component
│ ├── src/
│ │ └── PredictionScreen.js # Prediction screen
│ └── package.json # Node.js dependencies
├── data/ # Datasets
│ ├── train.csv
│ └── test.csv
└── notebook/ # Jupyter notebook (EDA and modeling)
└── eda-and-modelling.ipynb
```

## 🚀 Installation and Operation

### Prerequisites

- **Python 3.8+** (and pip)
- **Node.js 16+** (and npm/yarn)
- **Expo CLI** (must be installed globally)

### 1. Backend API Installation

```bash
# Navigate to the backend directory
cd backend-api

# Create a Python virtual environment (recommended)
python -m venv venv

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# IMPORTANT: If you get a scikit-learn version error:
# pip uninstall scikit-learn
# pip install scikit-learn==1.2.2

# Start the API
python api.py
# or
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

The backend API will run at `http://127.0.0.1:8000`.

**API Documentation:**
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### 2. Frontend Installation

```bash
# Navigate to the frontend directory
cd frontend-app

# Install dependencies
npm install
# or
yarn install

# Start the application
npm start
# or
yarn start
# or
expo start
```

After Expo starts:
- **For Web:** Press `w` or go to `http://localhost:19006` in your browser
- **For Android:** Press `a` (Android emulator or device required)
- **For iOS:** Press `i` (macOS and iOS simulator required)

### 3. API Configuring the Connection

The frontend application connects to `http://127.0.0.1:8000/predict` by default.

If the backend is running on a different IP address, update the `API_URL` variable in the `frontend-app/src/PredictionScreen.js` file:

```javascript
const API_URL = 'http://YOUR_IP_ADDRESS:8000/predict';
```

**Note:** If you are testing from a mobile device, you should use your computer's local IP address instead of `127.0.0.1` (e.g., `http://192.168.1.96:8000`).

## 📱 Usage

1. Launch the Backend API (follow the steps above)
2. Launch the Frontend Application
3. Fill out the form:
- **Age**: Customer age (18-120)
- **Balance**: Account balance (€)
- **Job**: Occupation
- **Housing Loan**: Do you have a housing loan? - **Marital Status**: Marital status
- **Previous Outcome**: Previous campaign result
4. Click the **"PREDICT SUBSCRIPTION"** button
5. View the prediction result

## 🔧 Technical Details

### Backend (FastAPI)
- **Model**: Random Forest Classifier
- **Feature Engineering**: One-Hot Encoding (for categorical variables)
- **Threshold Value**: 0.6 (loaded from optimal_threshold.json)
- **CORS**: All origins allowed (for development)

### Frontend (React Native/Expo)
- **Framework**: Expo ~54.0.25
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Icons**: @expo/vector-icons (FontAwesome5)

## 🐛 Troubleshooting

### Backend cannot be started
- Check Python version: `python --version` (must be 3.8+)
- Make sure all dependencies are installed: `pip list`
- Make sure the model files (`bank_marketing_rf_model.pkl`, `feature_cols.json`, `optimal_threshold.json`) are in the `backend-api` directory
- **If you are getting a scikit-learn version error**: Model was trained with version 1.2.2. Install the correct version:
```bash
pip uninstall scikit-learn
pip install scikit-learn==1.2.2
```

### Cannot connect to Frontend API
- Make sure the backend is running: Open `http://127.0.0.1:8000/docs` in your browser
- Check CORS settings (backend-api/api.py)
- If testing from a mobile device, use your computer's local IP address instead of `127.0.0.1`
- Check firewall settings

### Icons not showing
- Make sure the `@expo/vector-icons` package is installed: `npm list @expo/vector-icons`
- Restart Expo: `expo start -c` (clearing the cache)

## 📊 Model Performance

The model is exceeding a higher threshold due to low precision (35%) It attempts to reduce false positives using (0.6). This threshold value is loaded from the `optimal_threshold.json` file and can be adjusted according to business requirements.
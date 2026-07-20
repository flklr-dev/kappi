<p align="center">
  <img src="client/src/assets/logo-with-text.png" alt="Kappi Logo" width="450"/>
</p>

<p align="center">
  <b>KAPPI: COFFEE LEAF DISEASE DETECTION</b><br/>
  Empowering coffee farmers with real-time, offline, AI-powered disease classification and severity estimation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-53.0.0-4630EB?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/React_Native-0.79.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/TensorFlow_Lite-AI-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow Lite"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="License"/>
</p>

---

## ☕ Overview

**KAPPI** is an advanced, offline-first mobile application designed to assist coffee farmers, agricultural extension workers, and researchers in diagnosing and managing coffee plant diseases. 

By leveraging on-device machine learning (TensorFlow Lite), KAPPI allows farmers to capture photos of coffee leaves in remote fields without internet connectivity, diagnose the disease, and estimate the infection's severity. Based on these insights, the app provides tailored treatment plans depending on the coffee variety (**Arabica** or **Robusta**) and the infection stage.

---

## 🌿 Key Features

### 1. 🧠 Dual-Model AI Engine (Classification & Severity)
*   **Offline Inference**: Runs locally on-device using quantized **TensorFlow Lite (TFLite)** models (built on MobileNetV2, EfficientNetB0, or ResNet50).
*   **U-Net Lesion Segmentation**: If a disease is detected, KAPPI runs a secondary **U-Net segmentation model** (featuring a MobileNetV2 backbone) to identify leaf tissue versus lesion spots.
*   **Precision Severity Estimation**: Calculates the exact mathematical percentage of diseased surface area on the leaf:
    $$\text{Severity } \% = \left( \frac{\text{Lesion Pixels}}{\text{Leaf Pixels}} \right) \times 100\%$$
*   **Dynamic Stage Grading**: Classifies the disease progress based on U-Net coverage thresholds:
    *   **Healthy**: $0\%$ coverage.
    *   **Early Stage**: $< 10\%$ coverage (recommends cultural controls and preventive organic methods).
    *   **Progressive Stage**: $10\% - 30\%$ coverage (recommends localized chemical treatments and sanitation).
    *   **Severe Stage**: $\ge 30\%$ coverage (recommends aggressive intervention to protect crop yield).
*   **YOLOv8 Leaf Detection (Planned)**: An integration plan is in place to deploy a YOLOv8 Nano model to automatically localize coffee leaves and reject non-leaf objects (reducing false positives by 60-80%).

### 2. 📸 Smart Camera Scanner
*   **Live Camera**: High-performance Expo / Vision Camera controller supporting zoom, manual focus, and flash control for dark field environments.
*   **Gallery Import**: Allows importing pre-captured leaf images from the local media gallery.

### 3. 🗺️ Geolocation Tagging
*   **Outbreak Coordinates**: Automatically captures GPS coordinates during leaf scans.
*   **Administrative Geocoding**: Automatically resolves coordinates to administrative boundaries (Barangay, City/Municipality, Province) to map regional outbreaks.

### 4. 📝 Variety-Aware Disease Management
*   **Variety Tailored**: Treatment advice automatically splits and refines options based on whether the crop is Arabica or Robusta.
*   **Actionable Recs**: Detailed guidelines outlining cultural practices (sanitation, spacing, shadow adjustments) and chemical measures.

### 5. 🔄 Offline-First Synchronization
*   **Secure SQLite Logs**: Saves scans locally with encrypted SQLite tables if the farmer is offline.
*   **Auto-Cloud Sync**: Syncs metadata to MongoDB and uploads leaf photos to Cloudinary CDN automatically once network connectivity is restored.

### 6. 🌐 User-Friendly Accessibility
*   **Multilingual**: Smooth toggle between English and Bisaya.
*   **High Contrast & Dark Mode**: Native dark/light mode configurations to ease eye strain in bright sunlight.

---

## 🍂 Supported Diseases

KAPPI is specifically trained to detect the following coffee foliage diseases:

| Disease | Code | Primary Symptoms |
| :--- | :---: | :--- |
| **Coffee Leaf Rust (CLR)** | `LR` | Powdery orange/yellow spots on the underside of leaves. |
| **Leaf Spot (Cercospora)** | `LS` | Small circular brown spots with light-grey centers and yellow halos. |
| **Brown Eye Spot** | `BS` | Severe necrotic spots leading to premature defoliation. |
| **Sooty Mold** | `SM` | Black, coal-like superficial film caused by honeydew-secreting insects. |

---

## 📐 System Architecture & Design

KAPPI is built with a decoupled three-tier architecture: the React Native Mobile Client, Node.js Express API Server, and Python/PyTorch Machine Learning pipeline.

```mermaid
graph TD
    %% Styling
    classDef client fill:#d1ecf1,stroke:#0c5460,stroke-width:2px;
    classDef server fill:#d4edda,stroke:#155724,stroke-width:2px;
    classDef db fill:#fff3cd,stroke:#856404,stroke-width:2px;
    classDef ml fill:#f8d7da,stroke:#721c24,stroke-width:2px;

    subgraph Mobile_Client["📱 Mobile Client (React Native + Expo)"]
        UI["App UI / Screens (TypeScript)"]
        Zustand["Zustand State Stores<br>(Auth, Scan, Settings)"]
        TFLite["On-Device TFLite Engine<br>(MobileNetV2/EfficientNet)"]
        LocalStorage["Secure Local Caching<br>(SecureStore & Storage)"]
        GPS["Expo Location & Geocoding"]
        Camera["Expo Image Picker / Vision Camera"]
    end
    class Mobile_Client,UI,Zustand,TFLite,LocalStorage,GPS,Camera client;

    subgraph Backend_Server["⚙️ Backend Server (Express & Node.js)"]
        Router["Express Router & Rate Limiters"]
        AuthCtrl["Auth Controller<br>(JWT, Bcrypt, OTP)"]
        ScanCtrl["Scan History Controller"]
        UploadCtrl["Cloudinary Upload Handler"]
    end
    class Backend_Server,Router,AuthCtrl,ScanCtrl,UploadCtrl server;

    subgraph Services_DB["💾 Databases & Services"]
        MongoDB[("MongoDB Database<br>(User info & Scan logs)")]
        Cloudinary["Cloudinary Cloud Storage<br>(Image hosting)"]
        Nodemailer["Nodemailer Email Service<br>(Password reset OTPs)"]
    end
    class Services_DB,MongoDB,Cloudinary,Nodemailer db;

    subgraph ML_Pipeline["🧠 Machine Learning Pipeline (Python)"]
        Dataset["Image Dataset (Raw)"]
        CVAT["CVAT Annotation Tool"]
        Train["PyTorch / TensorFlow Training<br>(YOLOv8, ResNet50, MobileNetV2)"]
        Export["TFLite Quantized Converter<br>(INT8 / FP16)"]
    end
    class ML_Pipeline,Dataset,CVAT,Train,Export ml;

    %% Data Flow
    UI --> Zustand
    Zustand --> LocalStorage
    UI --> Camera
    Camera --> TFLite
    UI --> GPS
    
    %% API Interactions
    UI -- "HTTPS / REST API" --> Router
    Router --> AuthCtrl
    Router --> ScanCtrl
    Router --> UploadCtrl
    
    %% Database / Service Connections
    AuthCtrl -- "Send Verification Email" --> Nodemailer
    ScanCtrl -- "Write Metadata" --> MongoDB
    UploadCtrl -- "Upload Image" --> Cloudinary
    
    %% ML Pipeline Flow
    Dataset --> CVAT
    CVAT --> Train
    Train --> Export
    Export -.-> |"Packaged into app assets"| TFLite
```

### 📂 Repository File Structure

```
kappi/
├── client/                  # 📱 Mobile Frontend (React Native & Expo)
│   ├── assets/              # Static media assets, icons, and logo formats
│   ├── src/
│   │   ├── components/      # Shared presentation UI components
│   │   ├── config/          # Client environment keys & configurations
│   │   ├── constants/       # Fixed values (colors, styling, localization strings)
│   │   ├── context/         # Custom React contexts
│   │   ├── hooks/           # Reusable React hooks
│   │   ├── navigation/      # React Navigation setup (Stack/Tab bars)
│   │   ├── screens/         # Page components (Home, Scan, Result, History)
│   │   ├── services/        # Axios API clients for communicating with backend
│   │   ├── stores/          # Zustand State Management stores
│   │   ├── types/           # TypeScript declaration files
│   │   ├── utils/           # Helper utility functions
│   │   └── viewmodels/      # Screen business logic (MVVM architecture)
│   └── package.json
│
├── server/                  # ⚙️ REST API Backend (Node.js & Express)
│   ├── src/
│   │   ├── config/          # DB connection, Mail configuration, Env checkers
│   │   ├── controllers/     # Incoming HTTP request handlers
│   │   ├── middleware/      # Express authorization, Rate-limiting, Validation
│   │   ├── models/          # Mongoose database models (User, Scan, OTP)
│   │   ├── routes/          # API route definitions
│   │   └── index.ts         # Main Express entry point
│   └── package.json
│
└── ml/                      # 🧠 Machine Learning Engine (Python)
    ├── data/                # Dataset splitting scripts & metadata folders
    ├── model_export/        # Converted mobile TFLite models
    ├── scripts/             # Helper processing and dataset cleaning scripts
    ├── training scripts     # Python scripts for ResNet, MobileNet, EfficientNet training
    └── requirements.txt     # Python dependencies
```

---

## 🛠️ Development Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [Python 3.8+](https://www.python.org/) (required only for ML models training)
*   [MongoDB](https://www.mongodb.com/) (Local server or MongoDB Atlas cluster URI)
*   [Expo Go app](https://expo.dev/go) installed on your physical testing device

---

### 1. Backend Server Setup
1.  Navigate to the `server/` directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `server/` directory:
    ```env
    PORT=5000
    MONGODB_URI=mongodb+srv://your_username:password@cluster.mongodb.net/kappi
    JWT_SECRET=your_super_secret_jwt_key_here
    
    # Mail Config (for Password Reset OTP)
    EMAIL_USER=your_email@gmail.com
    EMAIL_APP_PASSWORD=your_gmail_app_password
    
    # Cloudinary Config (for Leaf images)
    CLOUDINARY_CLOUD_NAME=your_cloudinary_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```
4.  Build and run the server in development mode:
    ```bash
    npm run dev
    ```
    The backend will listen on `http://0.0.0.0:5000` (allowing local network connections from your phone).

---

### 2. Mobile Client Setup
1.  Navigate to the `client/` directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `client/` directory:
    ```env
    EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP_ADDRESS>:5000
    ```
    *(Note: Replace `<YOUR_LOCAL_IP_ADDRESS>` with the IPv4 address of your computer running the backend server so the physical mobile device can reach the API).*
4.  Start the Expo development server:
    ```bash
    npm start
    ```
5.  Scan the QR code printed in the terminal using the **Expo Go** application (Android) or the Camera app (iOS) to launch KAPPI on your phone.

---

### 3. Machine Learning Setup
To train, evaluate, or export models:
1.  Navigate to the `ml/` directory:
    ```bash
    cd ml
    ```
2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Choose a script to run, for example:
    *   **Train MobileNetV2**: `python train_mobilenetv2.py`
    *   **Train U-Net Segmentation**: `python train_segmentation_unet.py`
    *   **Train YOLOv8 Leaf Bounding Box**: `python train_yolov8_leaf_detector.py`
    *   **Export model to TFLite**: `python export_yolo_tflite.py`

---

## 📦 Building for Production

### iOS (EAS Build)
EAS enables building the iOS version of the app in the cloud without needing a macOS environment or Xcode installed locally.

Ensure you are in the `client/` directory and log in to your Expo account:
```bash
npx eas login
```

Create a build token:
```bash
npx eas token:create
```

#### Local EAS Commands
*   **Development Build (for registered test devices)**:
    ```bash
    npx eas build -p ios --profile development
    ```
*   **Production Build (for App Store submission)**:
    ```bash
    npx eas build -p ios --profile production
    ```
> [!WARNING]
> Do NOT commit the autogenerated `ios/` folder if generated on Windows, as platform-specific configurations may corrupt the cloud-based EAS compiler.

### Android
To compile the Android bundle (`.apk` or `.aab`):
```bash
npx eas build -p android --profile production
```

---

## 🛡️ License

This project is licensed under the **ISC License**. See the package configurations for details.

---

<p align="center">
  Developed with ❤️ for Coffee Growers & Farmers. Empowering sustainable agriculture.
</p>
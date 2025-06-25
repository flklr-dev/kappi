# KAPPI Mobile App – Implementation Checklist

## 📦 SECTION A. CORE SETUP & ENVIRONMENT
| Task | Status |
|---|---|
| Set up React Native with Expo + TypeScript | ✅ |
| Install essential Expo libraries (camera, location, media library) | ✅ |
| Set up project structure (MVVM or modular folder layout) | ✅ |

## 🔐 SECTION B. USER AUTHENTICATION
| Task | Status |
|---|---|
| Implement Google Sign-In | ✅ |
| Implement Facebook Login | ☐ |
| Implement manual registration (email/password) | ✅ |
| Connect frontend auth to backend (JWT-based) | ✅ |
| Implement logout and session expiration | ✅ |

## 📸 SECTION C. IMAGE SCANNING AND PROCESSING
| Task | Status |
|---|---|
| Integrate camera with preview + capture | ✅ |
| Add image preview screen before submission | ✅ |
| Preprocess image before upload (resize, normalize) | ☐ |
| Capture geo-coordinates at time of scan | ✅ |
| Save scan image + metadata to local SQLite and MongoDB | ✅ |

## 🧠 SECTION D. MODEL TRAINING & INTEGRATION
| Task | Status |
|---|---|
| Train base CNN model (ResNet50) on labeled dataset | ☐ |
| Train MobileNetV2 model for mobile inference | ☐ |
| Train EfficientNetB0 (optional) | ☐ |
| Convert final model to TensorFlow Lite | ☐ |
| Implement on-device inference using TFLite | ☐ |
| Add softmax-threshold rejection logic | ☐ |

## 🌿 SECTION E. DIAGNOSTIC LOGIC & TREATMENT DISPLAY
| Task | Status |
|---|---|
| Design diagnostic result screen (Disease + Stage) | ☐ |
| Allow user to specify variety (Arabica/Robusta) | ☐ |
| Link variety + diagnosis to treatment recommendation | ☐ |
| Display treatment tips with images/icons | ☐ |
| Option to share or save diagnosis report | ☐ |

## 📊 SECTION F. SCAN HISTORY & DATA LOGGING
| Task | Status |
|---|---|
| Store diagnostic results with timestamp and location | ☐ |
| Implement Scan History screen | ☐ |
| Allow viewing individual scan details | ☐ |
| Sync scan history with backend | ☐ |

## 🛰 SECTION G. API & BACKEND COMMUNICATION
| Task | Status |
|---|---|
| Connect to backend for user auth and token validation | ☐ |
| Send diagnostic data to backend (image, label, coord) | ☐ |
| Handle offline queueing & retry | ☐ |
| Sync treatment updates from backend | ☐ |
| Secure backend endpoints with role-based JWT | ☐ |

## 🧭 SECTION H. USER EXPERIENCE (UX)
| Task | Status |
|---|---|
| Design home screen with navigation to core features | ☐ |
| Add onboarding/tutorial slides | ☐ |
| Use offline indicators | ☐ |
| Support dark mode and large fonts | ☐ |
| Multilingual toggle (English / Cebuano / Tagalog) | ☐ |

## ☁️ SECTION I. DEPLOYMENT
| Task | Status |
|---|---|
| Configure EAS Build for Android and iOS | ☐ |
| Test on mid-range Android devices (2GB–4GB RAM) | ☐ |
| Prepare assets and app icon | ☐ |
| Submit to Google Play Store | ☐ |
| Submit to Apple TestFlight / App Store | ☐ | 
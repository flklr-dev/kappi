import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string) => string;
};

type Translations = {
  [key: string]: {
    [key: string]: string;
  };
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define translations
const translations: Translations = {
  en: {
    // Onboarding Screen
    "welcome_to_kappi": "Welcome to KAPPI",
    "your_ai_powered_coffee_disease_detection_assistant": "Your AI-powered coffee disease detection assistant for better farming",
    "capture_coffee_plants": "Capture Coffee Plants",
    "take_clear_photos_to_get_accurate_disease_detection": "Take clear photos to get accurate disease detection",
    "diseases_we_detect": "Diseases We Detect",
    "our_ai_can_identify_these_common_coffee_plant_diseases": "Our AI can identify these common coffee plant diseases",
    "get_started": "Get Started",
    "next": "Next",
    "skip": "Skip",
    
    // Login Screen
    "welcome_back": "Welcome Back",
    "detect_diseases_early_and_save_your_harvest": "Detect diseases early and save your harvest",
    "email": "Email",
    "enter_your_email": "Enter your email",
    "password": "Password",
    "enter_your_password": "Enter your password",
    "forgot_password": "Forgot Password?",
    "login": "Login",
    "or": "OR",
    "continue_with_google": "Continue with Google",
    "dont_have_an_account": "Don't have an account?",
    "sign_up": "Sign Up",
    
    // Register Screen
    "create_account": "Create Account",
    "get_ai_powered_disease_detection_tools": "Get AI-powered disease detection tools",
    "full_name": "Full Name",
    "enter_your_full_name": "Enter your full name",
    "confirm_password": "Confirm Password",
    "create_account_button": "Create Account",
    "already_have_an_account": "Already have an account?",
    "sign_in": "Sign In",
    
    // Password Complexity
    "at_least_8_characters": "At least 8 characters",
    "at_least_one_uppercase_letter": "At least one uppercase letter",
    "at_least_one_lowercase_letter": "At least one lowercase letter",
    "at_least_one_number": "At least one number",
    "at_least_one_special_character": "At least one special character",
    "very_weak": "Very Weak",
    "weak": "Weak",
    "fair": "Fair",
    "good": "Good",
    "strong": "Strong",
    "very_strong": "Very Strong",
    
    // Error Messages
    "this_field_is_required": "This field is required",
    "please_enter_a_valid_email": "Please enter a valid email",
    "password_must_be_at_least_8_characters": "Password must be at least 8 characters",
    "passwords_do_not_match": "Passwords do not match",
    "email_already_exists": "Email already exists. Please log in instead.",
    "account_already_exists": "Account Already Exists",
    "this_email_is_already_registered": "This email is already registered. Please login instead.",
    "go_to_login": "Go to Login",
    "failed_to_sign_up_with_google": "Failed to sign up with Google",
    "failed_to_sign_in_with_google": "Failed to sign in with Google",
    "an_unexpected_error_occurred": "An unexpected error occurred",
    "welcome_back_message": "Welcome back!",
    "welcome_to_kappi_message": "Welcome to KAPPI!",
    "account_successfully_registered": "Account successfully registered.",
    "success": "Success",
    "network_error_please_check_connection": "Network error. Please check your connection",
    "error": "Error",
    
    // Forgot Password Screen
    "forgot_password_title": "Forgot Password?",
    "forgot_password_subtitle": "Don't worry! Enter your email address and we'll send you a verification code to reset your password.",
    "send_verification_code": "Send Verification Code",
    "remember_your_password": "Remember your password?",
    
    // Reset Password Screen
    "reset_password_title": "Reset Password",
    "reset_password_subtitle": "Enter your new password below. Make sure it's strong and secure.",
    "enter_new_password": "Enter new password",
    "confirm_new_password": "Confirm new password",
    "reset_password_button": "Reset Password",
    "passwords_match": "✓ Passwords match",
    "password_reset_success": "Success! 🎉",
    "password_reset_success_message": "Your password has been reset successfully. You can now log in with your new password.",
    "go_to_login_button": "Go to Login",
    "validation_error": "Validation Error",
    "both_password_fields_required": "Both password fields are required.",
    "passwords_do_not_match_error": "Passwords do not match.",
    "password_requirements": "Password Requirements",
    "password_must_meet_requirements": "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
    "invalid_request": "Invalid Request",
    "please_start_from_forgot_password": "Please start from the forgot password screen.",
    "ok": "OK",
    
    // Verify OTP Screen
    "enter_verification_code": "Enter Verification Code",
    "verification_code_sent": "We've sent a 6-digit code to {email}. Enter the code below to verify your identity.",
    "code_expires_in": "Code expires in {time}",
    "code_has_expired": "Code has expired",
    "verification_code": "Verification Code",
    "code_must_be_6_digits": "Code must be 6 digits",
    "attempts_remaining": "{attempts} attempts remaining",
    "verify_code": "Verify Code",
    "resend_code": "Resend Code",
    "resend_code_timer": "Resend Code ({time}s)",
    "please_wait": "Please Wait",
    "request_new_code_in": "You can request a new code in {time} seconds.",
    "new_code_sent": "New Code Sent! 📧",
    "new_code_sent_message": "A new verification code has been sent to your email.",
    "too_many_attempts": "Too Many Attempts",
    "exceeded_max_attempts": "You have exceeded the maximum number of attempts. Please request a new code.",
    "request_new_code": "Request New Code",
    "invalid_input": "Invalid Input",
    "input_contains_invalid_characters": "Input contains invalid characters.",
    "verification_code_required": "Verification code is required.",
    "verification_code_must_be_6_digits": "Verification code must be 6 digits.",
    "verification_failed": "Verification Failed",
    "failed_to_verify_code": "Failed to verify code. Please check your connection and try again.",
    "failed_to_resend_code": "Failed to resend verification code. Please try again.",
    
    // Home Screen
    "good_day": "Good day,",
    "good_evening": "Good evening,",
    "location_unavailable": "Location Unavailable",
    "grow_smarter_and_harvest_better": "Grow Smarter and Harvest Better!",
    "identify_diseases_early_and_manage_crops_effectively": "Identify diseases early and manage crops effectively.",
    "quick_actions": "Quick Actions",
    "what_would_you_like_to_do": "What would you like to do?",
    "scan_plant": "Scan Plant",
    "diagnose_diseases": "Diagnose diseases",
    "scan_history": "Scan History",
    "view_past_scans": "View past scans",
    "reports": "Reports",
    "analytics_and_insights": "Analytics & insights",
    "plant_care": "Plant Care",
    "manage_and_prevent": "Manage & prevent",
    "recent_scans": "Recent Scans",
    "view_all": "View All",
    "no_recent_scans_yet": "No recent scans yet.",
    "healthy": "Healthy",
    "unknown": "Unknown",
    "permission_denied": "Permission Denied",
    "please_grant_location_permissions": "Please grant location permissions to use this feature.",
    
    // Scan Screen
    "scan_plant_title": "Scan Plant",
    "loading_camera": "Loading camera...",
    "camera_permission_required": "Camera Permission Required",
    "please_grant_camera_permission": "Please grant camera permission to use the scanner.",
    "open_settings": "Open Settings",
    "analyzing_image": "Analyzing image...",
    "saving_scan_and_syncing": "Saving scan and syncing...",
    "failed_to_process_image": "Failed to process image. Please try again.",
    "failed_to_pick_image_from_gallery": "Failed to pick image from gallery",
    "scan_unsuccessful": "Scan Unsuccessful",
    "could_not_recognize_coffee_plant": "We couldn't recognize a valid coffee plant part or disease. Please try again with a clearer image.",
    "try_again": "Try Again",
    "cancel": "Cancel",

    
    // Scanning Tips Modal
    "what_kappi_detects": "What KAPPI Detects",
    "kappi_can_identify_these_coffee_diseases": "KAPPI can identify these specific coffee plant diseases:",
    "leaves": "Leaves",
    "coffee_leaf_rust": "Coffee Leaf Rust",
    "thread_blight": "Thread Blight",
    "anthracnose": "Anthracnose",
    "stems": "Stems",
    "coffee_wilt_disease": "Coffee Wilt Disease",
    "berries": "Berries",
    "coffee_berry_disease": "Coffee Berry Disease",
    "perfect_lighting": "Perfect Lighting",
    "good_lighting_is_crucial": "Good lighting is crucial for accurate detection",
    "natural_daylight_is_best": "Natural daylight is best",
    "scan_between_7_10_am": "Scan between 7-10 AM",
    "avoid_harsh_shadows": "Avoid harsh shadows",
    "find_even_diffused_light": "Find even, diffused light",
    "use_flash_indoors": "Use flash indoors",
    "for_consistent_results": "For consistent results",
    "scanning_technique": "Scanning Technique",
    "follow_these_steps": "Follow these steps for the most accurate results",
    "get_close_to_affected_area": "Get close to the affected area",
    "fill_frame_with_diseased_part": "Fill the frame with the diseased part",
    "hold_steady_for_2_seconds": "Hold steady for 2 seconds",
    "let_camera_focus_completely": "Let the camera focus completely",
    "capture_the_photo": "Capture the photo",
    "tap_once_and_wait": "Tap once and wait for analysis",
    "back": "Back",
    "start_scanning": "Start Scanning",
    
    // Reports Screen
    "scan_summary": "Scan Summary",
    "total_scans": "Total Scans",
    "this_month": "This Month",
    "healthy_plants": "Healthy Plants",
    "diseased_plants": "Diseased Plants",
    "disease_distribution": "Disease Distribution",
    "scans_by_disease_type": "Scans by Disease Type",
    "percentage_of_all_scans": "Percentage of all scans",
    "weekly_scan_activity": "Weekly Scan Activity",
    "number_of_scans_over_time": "Number of Scans over Time",
    "last_8_weeks": "Last 8 weeks",
    "loading_statistics": "Loading statistics...",
    "no_data_available": "No data available",
    "get_started_by_scanning": "Get started by scanning!",
    "no_scans_yet": "No scans yet",
    "retry": "Retry",

    
    // Results Screen
    "scan_results": "Scan Results",
    "no_diagnosis_data_available": "No diagnosis data available",
    "retake": "Retake",
    "take_new_photo": "Take New Photo",
    "tap_to_view_full_image": "Tap to view full image",
    "diagnosis": "Diagnosis",
    "stage": "Stage",
    "confidence_score": "Confidence Score",
    "also_detected": "Also detected",
    "disease_management": "Disease Management",
    "choose_your_coffee_variety": "Choose your coffee variety:",
    "chemical_control": "Chemical Control",
    "cultural_control": "Cultural Control",
    "no_recommendations_available": "No recommendations available for this stage/variety.",
    "preventive_tips": "Preventive Tips",
    "preventive_care_for_healthy_plants": "Preventive Care for Healthy Plants",
    "cultural_tips": "Cultural Tips",
    "no_preventive_tips_available": "No preventive tips available for this variety.",
    "scan_another_image": "Scan Another Image",
    "new_scan": "New Scan",
    "view_scan_details": "View Scan Details",
    "early_signs_good_chance_to_control": "Early signs - Good chance to control",
    "spreading_needs_immediate_action": "Spreading - Needs immediate action",
    "advanced_stage_urgent_care_needed": "Advanced stage - Urgent care needed",
    "plant_is_in_good_health_continue_monitoring": "Plant is in good health - Continue regular monitoring",
    "status_unknown": "Status unknown",
    "saved": "Saved",
    "scan_result_saved_locally": "Scan result saved locally.",
    "failed_to_save_scan_result": "Failed to save scan result.",
    "detected_with": "detected with",
    "confidence": "confidence",
    
    // View Scan Screen
    "scan_details": "Scan Details",
    "scan_information": "Scan Information",
    "date": "Date",
    "location": "Location",
    "city_municipality": "City/Municipality",
    "province": "Province",
    
    // Scan History Screen
    "no_scan_history_yet": "No scan history yet.",
    "all_diseases": "All Diseases",
    "all_stages": "All Stages",
    "previous_page": "Prev",
    "next_page": "Next",
    "unknown_location": "Unknown Location",
    // Add new translation keys for delete functionality
    "delete": "Delete",
    "delete_scan_confirmation": "Delete Scan",
    "delete_scan_message": "Are you sure you want to delete this scan for",
    "scan_deleted_successfully": "Scan deleted successfully",
    "failed_to_delete_scan": "Failed to delete scan",

    
    // Profile Screen
    "profile": "Profile",
    "view_scan_history": "View Scan History",
    "set_password": "Set Password",
    "change_password": "Change Password",
    "delete_account": "Delete Account",
    "google_account": "Google Account",
    "linked": "Linked",
    "link": "Link",
    "account_linking_note": "Note: Accounts are automatically linked when you log in with Google using the same email address.",
    "preferences": "Preferences",
    "theme": "Theme",
    "language": "Language",
    "about": "About",
    "about_the_app": "About the App",
    "terms_and_conditions": "Terms & Conditions",
    "privacy_policy": "Privacy Policy",
    "logout": "Logout",
    "delete_account_title": "Delete Account",
    "delete_account_message": "Are you sure you want to delete your account? Your data will be permanently removed after 90 days.",
    "account_deleted": "Account Deleted",
    "account_deleted_message": "Your account has been deleted. Your data will be permanently removed after 90 days.",
    "account_reactivated": "Account Reactivated",
    "account_reactivated_message": "Your account has been reactivated successfully.",
    "failed_to_delete_account": "Failed to delete account. Please try again.",
    "cancel_action": "Cancel",
    "delete_action": "Delete",
    "logout_title": "Logout",
    "logout_message": "Are you sure you want to logout?",
    "logout_action": "Logout",
    "error_message": "Error",
    "failed_to_logout": "Failed to logout. Please try again.",
    "account_already_linked": "Account Already Linked",
    "account_already_linked_message": "Your Google account is already linked to your profile.",
    "failed_to_link_google": "Failed to link Google account. Please try again.",
    "set_password_title": "Set Password",
    "change_password_title": "Change Password",
    "set_password_subtitle": "Set a password to enable email/password login.",
    "change_password_subtitle": "Enter your current and new password below.",
    "current_password": "Current Password",
    "new_password": "New Password",
    "confirm_new_password_text": "Confirm New Password",
    "new_password_and_confirmation_required": "New password and confirmation are required",
    "all_password_fields_required": "Current password, new password, and confirmation are all required",
    "new_passwords_do_not_match": "New passwords do not match",
    "password_changed_successfully": "Password changed successfully. Please log in again.",
    "edit_profile": "Edit Profile",
    "you_can_only_change_name_once_every_5_days": "You can only change your name once every 5 days.",
    "full_name_label": "Full Name",
    "save_changes": "Save Changes",
    "loading_profile": "Loading profile...",
    "success_message": "Success",
    "profile_updated_successfully": "Profile updated successfully",
    "choose_app_theme": "Choose your app theme.",
    "dark_mode": "Dark Mode",
    "light_mode": "Light Mode",
    "choose_app_language": "Choose your app language.",
    "english": "English",
    "bisaya": "Bisaya",
    
    // About App Screen
    "about_kappi": "About Kappi",
    "overview": "Overview",
    "overview_description": "Kappi is a mobile application designed to help coffee farmers detect and manage plant diseases using AI-powered image recognition. Our core purpose is to provide accessible, real-time disease detection, enabling farmers to take timely action to protect their crops.",
    "key_features": "Key Features",
    "ai_powered_disease_detection_feature": "• AI-powered disease detection: Identify common coffee plant diseases.",
    "personalized_recommendations_feature": "• Personalized recommendations: Get variety-specific advice and stage-based treatment plans (chemical and cultural options).",
    "scan_history_feature": "• Scan history: Keep track of past scans with geolocation data.",
    "user_profile_feature": "• User profile: Manage your profile and settings.",
    "supported_diseases": "Supported Diseases",
    "kappi_currently_focuses_on_detecting": "Kappi currently focuses on detecting:",
    "coffee_leaf_rust_disease": "• Coffee Leaf Rust (CLR)",
    "thread_blight_disease": "• Thread Blight",
    "anthracnose_disease": "• Anthracnose",
    "coffee_wilt_disease_disease": "• Coffee Wilt Disease",
    "coffee_berry_disease_disease": "• Coffee Berry Disease",
    "target_users": "Target Users",
    "target_users_description": "This app is built for coffee farmers, agricultural workers, extension officers, and researchers studying coffee plant diseases.",
    "kappi_team_copyright": "© {year} Kappi Team. All rights reserved."
  },
  ceb: {
    // Onboarding Screen
    "welcome_to_kappi": "Malipayong Abot sa KAPPI",
    "your_ai_powered_coffee_disease_detection_assistant": "AI assistant sa pag-detect sa sakit sa kape para sa maayong pagpanguma",
    "capture_coffee_plants": "Kuhaa ang Tanom sa Kape",
    "take_clear_photos_to_get_accurate_disease_detection": "Kuhaa ang klarong litrato para sa tukma nga pag-ila sa sakit",
    "diseases_we_detect": "Mga Sakit nga Kami Makaila",
    "our_ai_can_identify_these_common_coffee_plant_diseases": "Ang among AI makaila sa komon nga sakit sa tanom sa kape",
    "get_started": "Pagsugod",
    "next": "Sunod",
    "skip": "Laktawi",
    
    // Login Screen
    "welcome_back": "Maayong Balik",
    "detect_diseases_early_and_save_your_harvest": "I-detect ang sakit sa sayo aron maluwas ang ani",
    "email": "Email",
    "enter_your_email": "Pagsulod sa email",
    "password": "Password",
    "enter_your_password": "Pagsulod sa password",
    "forgot_password": "Nakalimtan ang Password?",
    "login": "Mag-login",
    "or": "O",
    "continue_with_google": "Padayon gamit ang Google",
    "dont_have_an_account": "Wala kay account?",
    "sign_up": "Mag-register",
    
    // Register Screen
    "create_account": "Paghimo og Account",
    "get_ai_powered_disease_detection_tools": "Kuhaa ang galamiton sa pag-detect sa sakit gamit ang AI",
    "full_name": "Bug-os nga Ngalan",
    "enter_your_full_name": "Pagsulod sa bug-os nga ngalan",
    "confirm_password": "Kumpirma ang Password",
    "create_account_button": "Paghimo og Account",
    "already_have_an_account": "Aduna nay account?",
    "sign_in": "Mag-login",
    
    // Password Complexity
    "at_least_8_characters": "8 ka karakter o mas daghan",
    "at_least_one_uppercase_letter": "Uppercase nga letra",
    "at_least_one_lowercase_letter": "Lowercase nga letra",
    "at_least_one_number": "Numero",
    "at_least_one_special_character": "Espesyal nga karakter",
    "very_weak": "Grabe ka huyang",
    "weak": "Huyang",
    "fair": "Inin",
    "good": "Maayo",
    "strong": "Kusog",
    "very_strong": "Grabe ka kusog",
    
    // Error Messages
    "this_field_is_required": "Kini nga field gikinahanglan",
    "please_enter_a_valid_email": "Palihog og balido nga email",
    "password_must_be_at_least_8_characters": "Ang password kinahanglan 8 ka karakter o mas daghan",
    "passwords_do_not_match": "Ang password dili magkapareho",
    "email_already_exists": "Aduna na kini nga email. Palihog og login.",
    "account_already_exists": "Aduna na kining Account",
    "this_email_is_already_registered": "Kini nga email nakarehistro na. Palihog og login.",
    "go_to_login": "Adto sa Login",
    "failed_to_sign_up_with_google": "Napakyas ang pagparehistro gamit ang Google",
    "failed_to_sign_in_with_google": "Napakyas ang pag-login gamit ang Google",
    "an_unexpected_error_occurred": "May naay hitabo nga wala gilaoman",
    "welcome_back_message": "Maayong balik!",
    "welcome_to_kappi_message": "Malipayong pag-abot sa KAPPI!",
    "account_successfully_registered": "Malampuson nga nakarehistro ang account.",
    "success": "Malampuson",
    
    // Forgot Password Screen
    "forgot_password_title": "Nakalimtan ang Password?",
    "forgot_password_subtitle": "Ayaw kabalaka! Pagsulod sa email ug ipadala nato ang verification code para i-reset ang password.",
    "send_verification_code": "Ipadala ang Verification Code",
    "remember_your_password": "Nahinumdoman ang password?",
    
    // Reset Password Screen
    "reset_password_title": "I-reset ang Password",
    "reset_password_subtitle": "Pagsulod sa bag-ong password. Siguroha nga kusog kini.",
    "enter_new_password": "Bag-ong password",
    "confirm_new_password": "Kumpirma ang password",
    "reset_password_button": "I-reset ang Password",
    "passwords_match": "✓ Ang password magkapareho",
    "password_reset_success": "Malampuson! 🎉",
    "password_reset_success_message": "Malampuson nga na-reset ang password. Mahimo ka na karon nga mag-login gamit ang bag-ong password.",
    "go_to_login_button": "Adto sa Login",
    "validation_error": "Sayop sa Pagpanginano",
    "both_password_fields_required": "Gikinahanglan ang parehas nga password fields.",
    "passwords_do_not_match_error": "Ang password dili magkapareho.",
    "password_requirements": "Mga Kinahanglan sa Password",
    "password_must_meet_requirements": "Ang password kinahanglan 8 ka karakter uban sa uppercase, lowercase, numero, ug espesyal nga karakter.",
    "invalid_request": "Dili Balido nga Hangyo",
    "please_start_from_forgot_password": "Palihog sugdi gikan sa forgot password screen.",
    "ok": "OK",
    
    // Verify OTP Screen
    "enter_verification_code": "Pagsulod sa Verification Code",
    "verification_code_sent": "Gipadala ang 6-ka digit nga code sa {email}. Pagsulod sa code aron mapamatud ang pagkakakilanlan.",
    "code_expires_in": "Ang code mawagtang sa {time}",
    "code_has_expired": "Ang code nawagtang na",
    "verification_code": "Verification Code",
    "code_must_be_6_digits": "Ang code kinahanglan 6 ka digit",
    "attempts_remaining": "{attempts} ka pagsulay ang nahabilin",
    "verify_code": "Pamatud ang Code",
    "resend_code": "Ipadala Usab ang Code",
    "resend_code_timer": "Ipadala Usab ang Code ({time}s)",
    "please_wait": "Palihog Hulat",
    "request_new_code_in": "Mahimo ka nga mangayo og bag-ong code sa {time} ka segundo.",
    "new_code_sent": "Bag-ong Code nga Gipadala! 📧",
    "new_code_sent_message": "Ang bag-ong verification code gipadala sa email.",
    "too_many_attempts": "Daghan Kaayo nga Pagsulay",
    "exceeded_max_attempts": "Nalampasan ang maximum nga gidaghanon sa mga pagsulay. Palihog mangayo og bag-ong code.",
    "request_new_code": "Mangayo og Bag-ong Code",
    "invalid_input": "Dili Balido nga Input",
    "input_contains_invalid_characters": "Ang input adunay dili balido nga mga karakter.",
    "verification_code_required": "Gikinahanglan ang verification code.",
    "verification_code_must_be_6_digits": "Ang verification code kinahanglan 6 ka digit.",
    "verification_failed": "Napakyas ang Pagpamatud",
    "failed_to_verify_code": "Napakyas ang pagpamatud sa code. Susiha ang koneksyon ug sulayi pag-usab.",
    "failed_to_resend_code": "Napakyas ang pagpadala usab sa verification code. Sulayi pag-usab.",
    
    // Home Screen
    "good_day": "Maayong adlaw,",
    "good_evening": "Maayong gabii,",
    "location_unavailable": "Dili makuha ang lokasyon",
    "grow_smarter_and_harvest_better": "Tanom Mas Maalamon, Ani Mas Maayo!",
    "identify_diseases_early_and_manage_crops_effectively": "Ilhi ang sakit sa sayo ug dumala ang ani nga maayo",
    "quick_actions": "Mga Pwedeng Buhaton",
    "what_would_you_like_to_do": "Unsa ang imong buhaton?",
    "scan_plant": "Pagscan",
    "diagnose_diseases": "Pangita sa sakit",
    "scan_history": "Mga na-scan",
    "view_past_scans": "Tan-awa ang na-scan",
    "reports": "Mga Report",
    "analytics_and_insights": "Analisis ug Insight",
    "plant_care": "Atiman sa tanom",
    "manage_and_prevent": "Dumala ug paglikay",
    "recent_scans": "Mga na-scan",
    "view_all": "Tan-awa Tanan",
    "no_recent_scans_yet": "Wala pay na-scan.",
    "healthy": "Himsog",
    "unknown": "Wala Mailhi",
    "permission_denied": "Gidili ang Pagtugot",
    "please_grant_location_permissions": "Palihog hatagi og pagtugot sa lokasyon aron gamiton kini.",
    
    // Scan Screen
    "scan_plant_title": "Pagscan sa Tanom",
    "loading_camera": "Nag-load sa camera...",
    "camera_permission_required": "Gikinahanglan ang Pagtugot sa Camera",
    "please_grant_camera_permission": "Palihog hatagi og pagtugot sa camera aron gamiton ang scanner.",
    "cancel": "Kansela",
    "open_settings": "Ablihi ang mga Setting",
    "analyzing_image": "Nag-analyze sa litrato...",
    "saving_scan_and_syncing": "Nag-save sa scan ug nag-sync...",
    "error": "Sayop",
    "failed_to_process_image": "Napakyas sa pagproseso sa litrato. Palihog sulayi pag-usab.",
    "failed_to_pick_image_from_gallery": "Napakyas sa pagkuha sa litrato gikan sa gallery",
    "scan_unsuccessful": "Dili Malampuson ang Pagscan",
    "could_not_recognize_coffee_plant": "Dili namo mailhi ang parte sa tanom sa kape o sakit. Palihog sulayi pag-usab gamit ang mas klarong litrato.",
    "try_again": "Sulayi Pag-usab",
    
    // Scanning Tips Modal
    "what_kappi_detects": "Ang Nakikita sa KAPPI",
    "kappi_can_identify_these_coffee_diseases": "Ang KAPPI makakilala sa mga sakit sa tanom sa kape:",
    "leaves": "Dahon",
    "coffee_leaf_rust": "Coffee Leaf Rust",
    "thread_blight": "Thread Blight",
    "anthracnose": "Anthracnose",
    "stems": "Tangkod",
    "coffee_wilt_disease": "Coffee Wilt Disease",
    "berries": "Prutas",
    "coffee_berry_disease": "Coffee Berry Disease",
    "perfect_lighting": "Maayo nga Kahayag",
    "good_lighting_is_crucial": "Importante ang maayo nga kahayag para sa tukma nga pag-ila",
    "natural_daylight_is_best": "Ang natural nga kahayag ang pinakamaayo",
    "scan_between_7_10_am": "Pagscan tali sa 7-10 AM",
    "avoid_harsh_shadows": "Likayi ang dako nga mga shadow",
    "find_even_diffused_light": "Pangitaa ang parehas nga kahayag",
    "use_flash_indoors": "Gamita ang flash sa sulod",
    "for_consistent_results": "Para sa parehas nga resulta",
    "scanning_technique": "Teknik sa Pagscan",
    "follow_these_steps": "Sunda kini nga mga lakang para sa pinakamaayo nga resulta",
    "get_close_to_affected_area": "Duol sa apektadong parte",
    "fill_frame_with_diseased_part": "Punua ang frame sa masakiton nga parte",
    "hold_steady_for_2_seconds": "Hawdi og 2 ka segundo",
    "let_camera_focus_completely": "Hayaan ang camera nga makafocus og kompleto",
    "capture_the_photo": "Kuhai ang litrato",
    "tap_once_and_wait": "Tap-a kausa ug hulat sa analisis",
    "back": "Balik",
    "start_scanning": "Pagsugod sa Pagscan",
    
    // Reports Screen
    "scan_summary": "Summary sa Pagscan",
    "total_scans": "Kinatibuk-ang na-scan",
    "this_month": "Karong Buwan",
    "healthy_plants": "Himsog nga Tanom",
    "diseased_plants": "Nasakit nga Tanom",
    "disease_distribution": "Distribusyon sa Sakit",
    "scans_by_disease_type": "Mga Scan base sa Klase sa Sakit",
    "percentage_of_all_scans": "Porsyento sa tanan nga scans",
    "weekly_scan_activity": "Binuwanang Aktibidad sa Pagscan",
    "number_of_scans_over_time": "Numero sa Scans sa Lumayong Panahon",
    "last_8_weeks": "Niaging 8 ka semana",
    "loading_statistics": "Nag-andam sa statistics...",
    "no_data_available": "Wala'y datos nga anaa",
    "get_started_by_scanning": "Pagsugod pinaagi sa pagscan sa imong una nga tanom",
    "no_scans_yet": "Wala pay na-scan",
    "retry": "Sulayi pag-usab",
    
    // Results Screen
    "scan_results": "Mga Resulta sa Pagscan",
    "no_diagnosis_data_available": "Wala'y datos sa diagnosis",
    "retake": "Kuhaa Pag-usab",
    "take_new_photo": "Kuhaa ang Bag-ong Litrato",
    "tap_to_view_full_image": "I-tap aron tan-awon ang tibuok nga litrato",
    "diagnosis": "Diagnosis",
    "stage": "Himtang",
    "confidence_score": "Puntos sa Kumpiyansa",
    "also_detected": "Nakita pud",
    "disease_management": "Pangdumara sa Sakit",
    "choose_your_coffee_variety": "Pilia ang klase sa imong kape:",
    "chemical_control": "Kemikal nga Pangandam",
    "cultural_control": "Kultura nga Pangandam",
    "no_recommendations_available": "Wala'y rekomendasyon para niining himtanga/klase.",
    "preventive_tips": "Mga Tip sa Paglikay",
    "preventive_care_for_healthy_plants": "Atiman sa Paglikay alang sa Himog nga Tanom",
    "cultural_tips": "Mga Tip sa Kultura",
    "no_preventive_tips_available": "Wala'y preventive tips para niining klase.",
    "scan_another_image": "Pagscan og Lain nga Litrato",
    "new_scan": "Bag-ong Scan",
    "view_scan_details": "Tan-awa ang Detalye sa Scan",
    "early_signs_good_chance_to_control": "Sayo nga mga timailhan - Maayo nga tsansa sa pagdumara",
    "spreading_needs_immediate_action": "Nagkalat - Kinahanglan dayon nga aksyon",
    "advanced_stage_urgent_care_needed": "Abansadong himtang - Urgente nga pangandam kinahanglan",
    "plant_is_in_good_health_continue_monitoring": "Ang tanom himsog - Padayon sa regular nga pagbantay",
    "status_unknown": "Wala mailhi ang himtang",
    "saved": "Nasulbar",
    "scan_result_saved_locally": "Ang resulta sa pagscan nasulbar locally.",
    "failed_to_save_scan_result": "Napakyas sa pag-save sa resulta sa pagscan.",
    "detected_with": "nakita uban",
    "confidence": "kumpiyansa",
    
    // View Scan Screen
    "scan_details": "Detalye sa Scan",
    "scan_information": "Impormasyon sa Scan",
    "date": "Date",
    "location": "Location",
    "city_municipality": "Siyudad/Munisipyo",
    "province": "Probinsya",
    
    // Scan History Screen
    "no_scan_history_yet": "Wala pay na-scan.",
    "all_diseases": "Tanang Sakit",
    "all_stages": "Tanang Lebel",
    "previous_page": "Balik",
    "next_page": "Sunod",
    "unknown_location": "Wala Mailhi nga Lokasyon",
    // Add new translation keys for delete functionality
    "delete": "Tanggalon",
    "delete_scan_confirmation": "Tanggalon ang Scan",
    "delete_scan_message": "Sigurado ka nga gusto nimong tanggalon kining scan para sa",
    "scan_deleted_successfully": "Malampuson nga natanggal ang scan",
    "failed_to_delete_scan": "Napakyas sa pagtanggal sa scan",

    
    // Profile Screen
    "profile": "Profile",
    "view_scan_history": "Tan-awa ang Scan History",
    "set_password": "I-set ang Password",
    "change_password": "Usbon ang Password",
    "delete_account": "Tanggalon ang Account",
    "google_account": "Google Account",
    "linked": "Naka-link",
    "link": "I-link",
    "account_linking_note": "Note: Ang mga account awtomatikong na-link kon mag-login ka gamit ang Google gamit ang parehas nga email address.",
    "preferences": "Mga Kagustuhan",
    "theme": "Tema",
    "language": "Pinulongan",
    "about": "Bahin",
    "about_the_app": "Bahin sa App",
    "terms_and_conditions": "Mga Termino ug Kondisyon",
    "privacy_policy": "Patakaran sa Privacy",
    "logout": "Logout",
    "delete_account_title": "Tanggalon ang Account",
    "delete_account_message": "Sigurado ka nga gusto nimong tanggalon ang imong account? Ang imong datos permanenteng matanggal human sa 90 ka adlaw.",
    "account_deleted": "Natanggal ang Account",
    "account_deleted_message": "Natanggal na ang imong account. Ang imong datos permanenteng matanggal human sa 90 ka adlaw.",
    "account_reactivated": "Gi-activate ang Account",
    "account_reactivated_message": "Gi-activate na ang imong account.",
    "failed_to_delete_account": "Napakyas sa pagtanggal sa account. Palihog sulayi pag-usab.",
    "cancel_action": "Kansela",
    "delete_action": "Tanggalon",
    "logout_title": "Logout",
    "logout_message": "Sigurado ka nga gusto nimong mag-logout?",
    "logout_action": "Logout",
    "error_message": "Sayop",
    "failed_to_logout": "Napakyas sa pag-logout. Palihog sulayi pag-usab.",
    "account_already_linked": "Naka-link na ang Account",
    "account_already_linked_message": "Ang imong Google account naka-link na sa imong profile.",
    "failed_to_link_google": "Napakyas sa pag-link sa Google account. Palihog sulayi pag-usab.",
    "set_password_title": "I-set ang Password",
    "change_password_title": "Usbon ang Password",
    "set_password_subtitle": "I-set ang password aron ma-enable ang email/password login.",
    "change_password_subtitle": "Pagsulod sa imong karon ug bag-ong password sa ubos.",
    "current_password": "Karon nga Password",
    "new_password": "Bag-ong Password",
    "confirm_new_password_text": "Kumpirma ang Bag-ong Password",
    "new_password_and_confirmation_required": "Gikinahanglan ang bag-ong password ug kumpirmasyon",
    "all_password_fields_required": "Gikinahanglan ang karon nga password, bag-ong password, ug kumpirmasyon",
    "new_passwords_do_not_match": "Ang mga bag-ong password dili magkapareho",
    "password_changed_successfully": "Malampuson nga nabag-o ang password. Palihog mag-login pag-usab.",
    "edit_profile": "Usbon ang Profile",
    "you_can_only_change_name_once_every_5_days": "Mahimo nimong usbon ang ngalan kada 5 ka adlaw ra.",
    "full_name_label": "Bug-os nga Ngalan",
    "save_changes": "I-save ang mga Nabag-o",
    "loading_profile": "Nag-load sa profile...",
    "success_message": "Malampuson",
    "profile_updated_successfully": "Malampuson nga nabag-o ang profile",
    "choose_app_theme": "Pilia ang temang sa imong app.",
    "dark_mode": "Dark Mode",
    "light_mode": "Light Mode",
    "choose_app_language": "Pilia ang pinulongan sa imong app.",
    "english": "English",
    "bisaya": "Bisaya",
    
    // About App Screen
    "about_kappi": "Bahin sa Kappi",
    "overview": "Panglantaw",
    "overview_description": "Ang Kappi usa ka mobile application nga gidesinyo aron matabangan ang mga magsasaka sa kape sa pag-ila ug pagdumara sa mga sakit sa tanom gamit ang AI-powered image recognition. Ang among katuyoan mao ang paghatag og abot nga tinuod nga pag-ila sa sakit, aron makatabang sa mga magsasaka sa pagkuha og husto nga aksyon aron maprotektahan ang ilang ani.",
    "key_features": "Mga Importante nga Bahin",
    "ai_powered_disease_detection_feature": "• Pag-ila sa sakit gamit ang AI: Pag-ila sa komon nga sakit sa tanom sa kape.",
    "personalized_recommendations_feature": "• Personalized nga rekomendasyon: Pagkuha og variety-specific nga tambag ug stage-based nga plano sa pagtambal (chemical ug cultural nga kapilian).",
    "scan_history_feature": "• Kasaysayan sa pagscan: Pagbantay sa mga na-scanned nga tanom uban ang geolocation data.",
    "user_profile_feature": "• Profile sa tiggamit: Pagdumara sa imong profile ug mga setting.",
    "supported_diseases": "Mga Gisuportahan nga Sakit",
    "kappi_currently_focuses_on_detecting": "Kasamtang nag-focus ang Kappi sa pag-ila:",
    "coffee_leaf_rust_disease": "• Coffee Leaf Rust (CLR)",
    "thread_blight_disease": "• Thread Blight",
    "anthracnose_disease": "• Anthracnose",
    "coffee_wilt_disease_disease": "• Coffee Wilt Disease",
    "coffee_berry_disease_disease": "• Coffee Berry Disease",
    "target_users": "Mga Target nga Tiggamit",
    "target_users_description": "Kini nga app gihimo alang sa mga magsasaka sa kape, agricultural workers, extension officers, ug mga researcher nga nagtuon sa mga sakit sa tanom sa kape.",
    "kappi_team_copyright": "© {year} Kappi Team. Tanang katungod gireserba."
  }
};

// Helper function to get translation
export const getTranslation = (key: string, language: string): string => {
  return translations[language]?.[key] || translations['en'][key] || key;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    // Load saved language preference
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        if (savedLanguage) {
          setLanguage(savedLanguage);
        } else {
          // Set default language to English (removed device locale detection)
          setLanguage('en');
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (newLanguage: string) => {
    try {
      setLanguage(newLanguage);
      await AsyncStorage.setItem('appLanguage', newLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    return getTranslation(key, language);
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: changeLanguage,
      t
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

interface ScanningTipsModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

interface Step {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: React.JSX.Element;
}

const ScanningTipsModal: React.FC<ScanningTipsModalProps> = ({
  visible,
  onClose,
  isDarkMode,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

  const steps: Step[] = [
    {
      id: 'diseases',
      title: t('what_kappi_detects'),
      icon: 'leaf-outline',
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.stepDescription, { color: themedColors.gray }]}>
            {t('kappi_can_identify_these_coffee_diseases')}
          </Text>
          
          <View style={styles.diseaseGrid}>
            <View style={[styles.diseaseCard, { backgroundColor: isDarkMode ? themedColors.secondary : '#FFF5F5' }]}>
              <View style={[styles.diseaseIcon, { backgroundColor: '#FF6B6B20' }]}>
                <Ionicons name="leaf-outline" size={20} color="#FF6B6B" />
              </View>
              <Text style={[styles.diseaseCategoryTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('leaves')}</Text>
              <Text style={[styles.diseaseNamesList, { color: themedColors.gray }]}>
                {t('coffee_leaf_rust')}{'\n'}{t('thread_blight')}{'\n'}{t('anthracnose')}
              </Text>
            </View>

            <View style={[styles.diseaseCard, { backgroundColor: isDarkMode ? themedColors.secondary : '#F0F9FF' }]}>
              <View style={[styles.diseaseIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="git-branch-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.diseaseCategoryTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('stems')}</Text>
              <Text style={[styles.diseaseNamesList, { color: themedColors.gray }]}>
                {t('coffee_wilt_disease')}
              </Text>
            </View>

            <View style={[styles.diseaseCard, { backgroundColor: isDarkMode ? themedColors.secondary : '#F0FDF4' }]}>
              <View style={[styles.diseaseIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="ellipse-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.diseaseCategoryTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('berries')}</Text>
              <Text style={[styles.diseaseNamesList, { color: themedColors.gray }]}>
                {t('coffee_berry_disease')}
              </Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'lighting',
      title: t('perfect_lighting'),
      icon: 'sunny-outline',
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.stepDescription, { color: themedColors.gray }]}>
            {t('good_lighting_is_crucial')}
          </Text>
          
          <View style={styles.lightingTips}>
            <View style={[styles.tipRow, { backgroundColor: isDarkMode ? themedColors.secondary : '#FFFBEB' }]}>
              <View style={[styles.tipIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.tipTextContainer}>
                <Text style={[styles.tipTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('natural_daylight_is_best')}</Text>
                <Text style={[styles.tipSubtitle, { color: themedColors.gray }]}>{t('scan_between_7_10_am')}</Text>
              </View>
            </View>

            <View style={[styles.tipRow, { backgroundColor: isDarkMode ? themedColors.secondary : '#FEF3F2' }]}>
              <View style={[styles.tipIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="flash-off-outline" size={18} color="#EF4444" />
              </View>
              <View style={styles.tipTextContainer}>
                <Text style={[styles.tipTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('avoid_harsh_shadows')}</Text>
                <Text style={[styles.tipSubtitle, { color: themedColors.gray }]}>{t('find_even_diffused_light')}</Text>
              </View>
            </View>

            <View style={[styles.tipRow, { backgroundColor: isDarkMode ? themedColors.secondary : '#F0FDF4' }]}>
              <View style={[styles.tipIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="flash-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.tipTextContainer}>
                <Text style={[styles.tipTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('use_flash_indoors')}</Text>
                <Text style={[styles.tipSubtitle, { color: themedColors.gray }]}>{t('for_consistent_results')}</Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'technique',
      title: t('scanning_technique'),
      icon: 'camera-outline',
      content: (
        <View style={styles.stepContent}>
          <Text style={[styles.stepDescription, { color: themedColors.gray }]}>
            {t('follow_these_steps')}
          </Text>
          
          <View style={styles.techniqueSteps}>
            <View style={styles.techniqueStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('get_close_to_affected_area')}</Text>
                <Text style={[styles.stepText, { color: themedColors.gray }]}>{t('fill_frame_with_diseased_part')}</Text>
              </View>
            </View>

            <View style={styles.techniqueStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('hold_steady_for_2_seconds')}</Text>
                <Text style={[styles.stepText, { color: themedColors.gray }]}>{t('let_camera_focus_completely')}</Text>
              </View>
            </View>

            <View style={styles.techniqueStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text style={[styles.stepTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('capture_the_photo')}</Text>
                <Text style={[styles.stepText, { color: themedColors.gray }]}>{t('tap_once_and_wait')}</Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipToEnd = () => {
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      onShow={() => setCurrentStep(0)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.gray + '20' }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.mainIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name={steps[currentStep].icon} size={24} color={COLORS.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                {steps[currentStep].title}
              </Text>
            </View>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={24} color={themedColors.gray} />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index <= currentStep ? COLORS.primary : themedColors.gray + '30',
                  },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {steps[currentStep].content}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: isDarkMode ? themedColors.lightGray : COLORS.gray + '20' }]}>
            <View style={styles.footerButtons}>
              {currentStep > 0 && (
                <TouchableOpacity onPress={previousStep} style={styles.secondaryButton}>
                  <Ionicons name="chevron-back-outline" size={20} color={COLORS.primary} />
                  <Text style={[styles.secondaryButtonText, { color: COLORS.primary }]}>{t('back')}</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.spacer} />
              
              {currentStep < steps.length - 1 && (
                <TouchableOpacity onPress={skipToEnd} style={styles.skipButton}>
                  <Text style={[styles.skipButtonText, { color: themedColors.gray }]}>{t('skip')}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity onPress={nextStep} style={[styles.primaryButton, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.primaryButtonText}>
                  {currentStep < steps.length - 1 ? t('next') : t('start_scanning')}
                </Text>
                {currentStep < steps.length - 1 && (
                  <Ionicons name="chevron-forward-outline" size={20} color="white" style={styles.buttonIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.92,
    height: '70%',
    // maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepContent: {
    // paddingTop: 20,
    // paddingBottom: 20,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  diseaseGrid: {
    gap: 12,
    flexDirection: 'column',
    // flexWrap: 'wrap',
  },
  diseaseCard: {
    borderRadius: 16,
    padding: 16,
    // alignItems: 'flex-start',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  diseaseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  diseaseCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    // marginBottom: 8,
    color: COLORS.black,
    marginRight: 10,
  },
  diseaseNamesList: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    flex: 1,
  },
  lightingTips: {
    gap: 12,
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tipSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  techniqueSteps: {
    gap: 20,
    width: '100%',
  },
  techniqueStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray + '20',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  spacer: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 4,
  },
});

export default ScanningTipsModal;

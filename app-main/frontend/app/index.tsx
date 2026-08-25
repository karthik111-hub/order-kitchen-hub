import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, type, shadow } from '@/src/theme';

export default function LandingPage() {
  const router = useRouter();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleContactTeam = () => {
    Haptics.selectionAsync();
    const subject = 'Contact - ServeSync';
    const body = 'Hello, I would like to get in touch with your team.';
    const mailtoLink = `mailto:krtheek@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = mailtoLink;
    }
  };

  const handleNavigateWorks = () => {
    Haptics.selectionAsync();
    if (typeof window !== 'undefined') {
      window.location.href = '/krfoodcourt';
    } else {
      router.push('/krfoodcourt' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <View style={styles.videoContainer}>
        <video
          autoPlay
          muted
          loop
          style={styles.video}
          onLoadedData={() => setVideoLoaded(true)}
          src="/Animation.mp4"
        />
        {!videoLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        )}
        <View style={styles.overlay} />
      </View>

      {/* Content Overlay */}
      <View style={styles.content}>
        {/* Header - takes up center space */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>ServeSync</Text>
          <Text style={styles.brandSubtitle}>
            Personalized order and kitchen management system
          </Text>
        </View>

        {/* Bottom Section - Buttons + Footer */}
        <View style={styles.bottomSection}>
          {/* Button Container - Side by side */}
          <View style={styles.buttonContainer}>
            {/* Contact Team Button */}
            <Pressable
              onPress={handleContactTeam}
              style={({ pressed }) => [
                styles.button,
                styles.contactBtn,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="mail-outline" size={16} color={colors.onBrandPrimary} />
              <View style={styles.buttonContent}>
                <Text style={styles.buttonTitle}>Contact Team</Text>
                <Text style={styles.buttonSubtitle}>Get in touch</Text>
              </View>
            </Pressable>

            {/* Navigate to Works Button */}
            <Pressable
              onPress={handleNavigateWorks}
              style={({ pressed }) => [
                styles.button,
                styles.worksBtn,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="compass-outline" size={16} color={colors.brand} />
              <View style={styles.buttonContent}>
                <Text style={[styles.buttonTitle, { color: colors.brand }]}>Recent Works</Text>
                <Text style={[styles.buttonSubtitle, { color: colors.onSurfaceTertiary }]}>
                  ServeSync
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 Draak Studios. All rights reserved.
            </Text>
            <Text style={styles.contactInfo}>
              Email: krtheek@gmail.com
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  video: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  loadingOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.onBrandPrimary,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    fontSize: type.base,
    color: colors.onBrandPrimary,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSection: {
    gap: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row' as any,
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
    maxWidth: 180,
  },
  contactBtn: {
    backgroundColor: colors.brand,
  },
  worksBtn: {
    backgroundColor: colors.onBrandPrimary,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: type.sm,
    fontWeight: '800',
    color: colors.onBrandPrimary,
    letterSpacing: -0.3,
  },
  buttonSubtitle: {
    fontSize: type.xs,
    color: colors.onBrandPrimary,
    opacity: 0.85,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: type.sm,
    color: colors.onBrandPrimary,
    opacity: 0.8,
  },
  contactInfo: {
    fontSize: type.sm,
    color: colors.brand,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LogBox } from "react-native";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

// Disable logbox errors
LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();
  const segments = useSegments();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        const currentSegment = segments[0];

        // If trying to access protected routes without authentication
        if (["admin", "master", "chef"].includes(currentSegment)) {
          if (!storedRole || storedRole !== currentSegment) {
            // Redirect to login
            router.replace("/");
          }
        }
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [segments, router]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

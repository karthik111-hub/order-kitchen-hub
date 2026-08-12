import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useRouter, usePathname } from "expo-router";
import { LogBox } from "react-native";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

// Disable logbox errors
LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use localStorage for web, which works in Expo web
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
        
        // Extract first segment from pathname
        const segments = pathname.split("/").filter(Boolean);
        const currentSegment = segments[0];

        // If trying to access protected routes without authentication
        if (["admin", "master", "chef"].includes(currentSegment)) {
          if (!storedRole || storedRole !== currentSegment) {
            console.log(`Auth failed: segment=${currentSegment}, storedRole=${storedRole}`);
            router.replace("/");
            return;
          }
        }
      } catch (e) {
        console.error("Auth check error:", e);
        router.replace("/");
      }
    };

    checkAuth();
  }, [pathname, router]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

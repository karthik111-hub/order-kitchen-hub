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
        // Use localStorage for web
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
        
        // Extract first segment from pathname
        const segments = pathname.split("/").filter(Boolean);
        const currentSegment = segments[0];

        // If trying to access protected routes
        if (["admin", "master", "chef"].includes(currentSegment)) {
          // Check if user has valid role for this route
          if (!storedRole) {
            // No authentication at all
            console.log(`No auth found for segment: ${currentSegment}`);
            router.replace("/");
            return;
          }
          
          if (storedRole !== currentSegment) {
            // Logged in but with wrong role
            console.log(`Role mismatch: trying to access ${currentSegment} but authenticated as ${storedRole}`);
            router.replace("/");
            return;
          }
          
          // Valid role for this route - allow access
          console.log(`Auth valid: ${storedRole} accessing /${storedRole}`);
        }
      } catch (e) {
        console.error("Auth check error:", e);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

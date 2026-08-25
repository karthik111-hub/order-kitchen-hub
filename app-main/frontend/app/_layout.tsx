import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { LogBox } from "react-native";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";

// Disable logbox errors
LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (!loaded && !error) return;

    const checkAuth = () => {
      try {
        // Use localStorage for web
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
        
        // Extract path segments from pathname
        const segments = pathname.split("/").filter(Boolean);
        
        // Check if path includes krfoodcourt
        if (segments[0] === 'krfoodcourt') {
          if (segments.length === 1) {
            // User is at /krfoodcourt (root of krfoodcourt) - this is the login page, allow it
            setAuthChecked(true);
            return;
          }
          
          if (segments.length > 1) {
            const currentSegment = segments[1]; // admin, master, or chef

            // If trying to access protected routes
            if (["admin", "master", "chef"].includes(currentSegment)) {
              // Check if user has valid role for this route
              if (!storedRole) {
                // No authentication at all
                console.log(`No auth found for segment: ${currentSegment}`);
                router.replace("/krfoodcourt");
                return;
              }
              
              if (storedRole !== currentSegment) {
                // Logged in but with wrong role
                console.log(`Role mismatch: trying to access /krfoodcourt/${currentSegment} but authenticated as ${storedRole}`);
                router.replace("/krfoodcourt");
                return;
              }
              
              // Valid role for this route - allow access
              console.log(`Auth valid: ${storedRole} accessing /krfoodcourt/${storedRole}`);
            }
          }
        } else if (pathname === '/') {
          // Root path - show landing page, don't redirect
          // Landing page should be visible to all users
        }
      } catch (e) {
        console.error("Auth check error:", e);
      } finally {
        setAuthChecked(true);
      }
    };

    // Only check auth after layout is mounted
    setTimeout(() => {
      checkAuth();
    }, 0);
  }, [loaded, error, pathname, router]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

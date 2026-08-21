import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/krfoodcourt');
  }, [router]);

  return null;
}

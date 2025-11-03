import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function LeaderboardTab() {
  const router = useRouter();
  const hasRedirected = useRef(false);
  
  useEffect(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/leaderboard');
    }
  }, []);
  
  return null;
}


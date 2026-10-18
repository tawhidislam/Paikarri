import { useQuery } from '@tanstack/react-query';
import { configured } from './supabase';
import { settings } from './admin-api';
export const usePlatformSettings = () =>
  useQuery({
    queryKey: ['platform-settings'],
    queryFn: settings,
    enabled: configured,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

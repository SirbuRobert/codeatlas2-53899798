import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PRO_PRODUCT_ID = 'prod_U9UXjFYfVVytEE';
const CACHE_KEY = 'axon_sub_cache';
const CACHE_TTL_MS = 60_000; // 1 minute

interface SubCache {
  isPro: boolean;
  ts: number;
}

function readCache(): SubCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: SubCache = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(isPro: boolean) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ isPro, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function useSubscription() {
  const { user } = useAuth();
  const cached = readCache();
  const [isPro, setIsPro] = useState<boolean>(cached?.isPro ?? false);
  const [loading, setLoading] = useState<boolean>(!cached);

  const refresh = async () => {
    if (!user) { setIsPro(false); setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        const pro = data.subscribed === true && data.product_id === PRO_PRODUCT_ID;
        setIsPro(pro);
        writeCache(pro);
      }
    } catch (e) {
      console.warn('[useSubscription] error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setIsPro(cached.isPro);
      setLoading(false);
      return;
    }
    refresh();
  }, [user?.id]);

  // Refresh every 60s while mounted
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return { isPro, loading, refresh };
}

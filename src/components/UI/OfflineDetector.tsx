"use client";

import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/useToastStore';

export const OfflineDetector = () => {
    const wasOffline = useRef(false);

    useEffect(() => {
        const handleOffline = () => {
            wasOffline.current = true;
            toast.warning('CONNECTION_LOST', 'Neural uplink severed. Reconnect to continue operations.');
        };

        const handleOnline = () => {
            if (wasOffline.current) {
                wasOffline.current = false;
                toast.success('CONNECTION_RESTORED', 'Neural uplink re-established. Signal stable.');
            }
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    return null;
};

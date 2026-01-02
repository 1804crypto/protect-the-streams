"use client";

import { useTransactionRecovery } from '@/hooks/useTransactionRecovery';

export const SystemHeartbeat = () => {
    // This hook runs the background check for in-flight transactions
    useTransactionRecovery();

    // Invisible component
    return null;
};

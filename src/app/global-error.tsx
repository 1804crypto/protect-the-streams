"use client";

import React, { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

async function reportGlobalError(error: Error, digest?: string) {
    try {
        await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'ERROR',
                component: 'NextGlobalErrorBoundary',
                message: error.message || 'Critical unhandled error',
                metadata: {
                    digest,
                    stack: error.stack?.slice(0, 1000),
                    url: typeof window !== 'undefined' ? window.location.href : null,
                },
            }),
        });
    } catch {
        // Never throw in global error handler
    }
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        reportGlobalError(error, error.digest);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, background: '#050505', color: '#ffffff', fontFamily: 'monospace' }}>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    textAlign: 'center',
                }}>
                    <div style={{ maxWidth: '400px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '2px solid #ff003c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                        }}>
                            <span style={{ color: '#ff003c', fontSize: '24px', fontWeight: 900 }}>!</span>
                        </div>
                        <h1 style={{ color: '#ff003c', fontSize: '20px', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '8px' }}>
                            CRITICAL_SIGNAL_LOSS
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '0.2em', marginBottom: '8px' }}>
                            RESISTANCE NETWORK DISRUPTED
                        </p>
                        {error.digest && (
                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', marginBottom: '24px' }}>
                                INCIDENT_ID: {error.digest}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: '1px solid #00f3ff',
                                    color: '#00f3ff',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    letterSpacing: '0.2em',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                }}
                            >
                                RETRY
                            </button>
                            <button
                                onClick={() => { window.location.href = '/'; }}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 900,
                                    letterSpacing: '0.2em',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                }}
                            >
                                RELOAD
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}

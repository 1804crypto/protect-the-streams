"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ERROR_BOUNDARY] Unhandled render error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center p-8">
                    <div className="max-w-lg w-full border border-red-500/50 bg-red-950/20 p-8 font-mono">
                        <div className="text-red-500 text-xs tracking-widest uppercase mb-4">
                            SYSTEM_FAULT_DETECTED
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            CRITICAL_ERROR
                        </h1>
                        <p className="text-white/60 text-sm mb-4">
                            An unexpected error has disrupted the resistance network.
                            Attempting signal recovery...
                        </p>
                        <div className="bg-black/50 border border-red-500/20 p-3 mb-6 text-xs text-red-400 overflow-auto max-h-32">
                            {this.state.error?.message || 'Unknown system fault'}
                        </div>
                        <button
                            onClick={this.handleRetry}
                            className="w-full py-3 px-6 border border-neon-blue/50 text-neon-blue font-mono text-sm tracking-widest uppercase hover:bg-neon-blue/10 transition-all"
                        >
                            [REINITIALIZE_SYSTEM]
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

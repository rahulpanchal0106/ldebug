'use client'

import { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { CreateMLCEngine, MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";

const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

type MLCEngineContextType = {
    engine: MLCEngineInterface | null;
    status: string;
    progress: number;
    isDownloading: boolean;
    isLoading: boolean;
    initializeEngine: () => Promise<void>;
};

const MLCEngineContext = createContext<MLCEngineContextType | undefined>(undefined);

export function MLCEngineProvider({ children }: { children: ReactNode }) {
    const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
    const [status, setStatus] = useState<string>("Ready to Load");
    const [progress, setProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const startTimeRef = useRef<number>(0);

    const initializeEngine = async () => {
        // Don't reinitialize if already loaded
        if (engine) {
            setStatus("Brain is Online 🧠");
            return;
        }

        // Don't start if already loading
        if (isLoading) {
            return;
        }

        startTimeRef.current = Date.now();
        setStatus("Initializing...");
        setProgress(0);
        setIsDownloading(false);
        setIsLoading(true);

        try {
            const newEngine = await CreateMLCEngine(MODEL_ID, {
                initProgressCallback: (report: InitProgressReport) => {
                    setProgress(report.progress);

                    // Detect if this is a download (takes longer) vs cache load (faster)
                    const elapsed = Date.now() - startTimeRef.current;
                    const isLikelyDownload = elapsed > 2000 && report.progress < 0.5;

                    if (isLikelyDownload && !isDownloading) {
                        setIsDownloading(true);
                    }

                    // Update status based on whether we're downloading or loading from cache
                    if (isLikelyDownload) {
                        setStatus(`Downloading Model... ${report.text}`);
                    } else if (report.progress > 0 && report.progress < 1) {
                        setStatus(`Loading from cache... ${Math.round(report.progress * 100)}%`);
                    } else {
                        setStatus(report.text);
                    }
                },
            });

            setEngine(newEngine);
            setStatus("Brain is Online 🧠");
            setProgress(1);
            setIsDownloading(false);
        } catch (error) {
            console.error(error);
            setStatus("Error (Check GPU)");
            setIsDownloading(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MLCEngineContext.Provider
            value={{
                engine,
                status,
                progress,
                isDownloading,
                isLoading,
                initializeEngine,
            }}
        >
            {children}
        </MLCEngineContext.Provider>
    );
}

export function useMLCEngine() {
    const context = useContext(MLCEngineContext);
    if (context === undefined) {
        throw new Error('useMLCEngine must be used within an MLCEngineProvider');
    }
    return context;
}


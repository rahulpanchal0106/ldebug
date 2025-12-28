'use client'

import { MLCEngineProvider } from './MLCEngineProvider';

export function MLCEngineProviderWrapper({ children }: { children: React.ReactNode }) {
    return <MLCEngineProvider>{children}</MLCEngineProvider>;
}


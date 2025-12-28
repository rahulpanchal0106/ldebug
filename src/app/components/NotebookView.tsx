'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NotebookInterface from './NotebookInterface';
import VisualizationsView from './VisualizationsView';
import { useTheme } from './ThemeProvider';
import { logoutAction } from '@/src/actions/auth';

type Tab = 'notebook' | 'visualizations';

export default function NotebookView() {
    const [activeTab, setActiveTab] = useState<Tab>('notebook');
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    const handleLogout = async () => {
        await logoutAction();
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="w-full h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between p-2">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setActiveTab('notebook')}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                activeTab === 'notebook'
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            📓 Notebook
                        </button>
                        <button
                            onClick={() => setActiveTab('visualizations')}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                                activeTab === 'visualizations'
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            📊 Visualizations
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-lg bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors text-sm font-semibold"
                            title="Logout"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'notebook' && <NotebookInterface />}
                {activeTab === 'visualizations' && <VisualizationsView />}
            </div>
        </div>
    );
}


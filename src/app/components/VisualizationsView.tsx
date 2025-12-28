'use client'

import { useState, useEffect } from 'react';
import { getAnalyticsSummary } from '@/src/actions/getMemory';

export default function VisualizationsView() {
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    useEffect(() => {
        loadAnalytics();
    }, [days]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const data = await getAnalyticsSummary(days);
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Visualizations</h1>
                
                {/* Time Period Selector */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setDays(7)}
                        className={`px-4 py-2 rounded-lg ${days === 7 ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setDays(30)}
                        className={`px-4 py-2 rounded-lg ${days === 30 ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                        30 Days
                    </button>
                    <button
                        onClick={() => setDays(90)}
                        className={`px-4 py-2 rounded-lg ${days === 90 ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                    >
                        90 Days
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Logs</h3>
                                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                                    {analytics.reduce((sum, item) => sum + (item.count || 0), 0)}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Average Mood</h3>
                                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                                    {analytics.length > 0
                                        ? (analytics.reduce((sum, item) => sum + (item.avgMood || 0), 0) / analytics.length).toFixed(1)
                                        : '0'}
                                    /10
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Average Productivity</h3>
                                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                                    {analytics.length > 0
                                        ? (analytics.reduce((sum, item) => sum + (item.avgProductivity || 0), 0) / analytics.length).toFixed(1)
                                        : '0'}
                                    /10
                                </p>
                            </div>
                        </div>

                        {/* Domain Breakdown */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Activity Breakdown</h2>
                            <div className="space-y-4">
                                {analytics.length > 0 ? (
                                    analytics.map((item, index) => (
                                        <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                                                        {item.domainName || 'Unknown'}
                                                    </span>
                                                    {item.activityName && (
                                                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                                                            - {item.activityName}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {item.count || 0} logs
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400">Avg Mood: </span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {(item.avgMood || 0).toFixed(1)}/10
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400">Avg Energy: </span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {(item.avgEnergy || 0).toFixed(1)}/10
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400">Avg Productivity: </span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {(item.avgProductivity || 0).toFixed(1)}/10
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                        No data available for the selected period
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Placeholder for future visualizations */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Coming Soon</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                More visualizations including charts, trends, and correlations will be available here.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


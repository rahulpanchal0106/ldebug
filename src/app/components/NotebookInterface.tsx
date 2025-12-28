'use client'

import { useState, useEffect, useCallback } from 'react';
import { getAllLogs, getLogsByDate, LogEntry } from '@/src/actions/getLogs';
import NotebookPage from './NotebookPage';
import CalendarIndex from './CalendarIndex';
import PageNavigation from './PageNavigation';
import LogInputPage from './LogInputPage';
import ChatPage from './ChatPage';

export default function NotebookInterface() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [mode, setMode] = useState<'notebook' | 'chat'>('notebook');

    // Load all logs on mount
    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const allLogs = await getAllLogs();
            setLogs(allLogs.reverse());
            // Start at the last page (input page)
            setCurrentPageIndex(allLogs.length);
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateSelect = async (date: Date) => {
        setSelectedDate(date);
        setShowCalendar(false);
        
        // Find the first log for this date in the current logs array
        const dateStr = date.toDateString();
        const logIndex = logs.findIndex(log => {
            const logDate = new Date(log.createdAt);
            return logDate.toDateString() === dateStr;
        });
        
        if (logIndex !== -1) {
            setCurrentPageIndex(logIndex);
        } else {
            // If not found in current logs, try fetching logs for that date
            const dateLogs = await getLogsByDate(date);
            if (dateLogs.length > 0) {
                // Reload all logs to include this date's logs
                const updatedLogs = await getAllLogs();
                setLogs(updatedLogs);
                // Then find the index after reload
                const newIndex = updatedLogs.findIndex(log => {
                    const logDate = new Date(log.createdAt);
                    return logDate.toDateString() === dateStr;
                });
                if (newIndex !== -1) {
                    setCurrentPageIndex(newIndex);
                }
            }
        }
    };

    const handleNextPage = useCallback(() => {
        setCurrentPageIndex(prev => {
            if (prev < logs.length) {
                return prev + 1;
            }
            return prev;
        });
    }, [logs.length]);

    const handlePrevPage = useCallback(() => {
        setCurrentPageIndex(prev => {
            if (prev > 0) {
                return prev - 1;
            }
            return prev;
        });
    }, []);

    const handleLogSaved = async () => {
        // Reload logs after saving
        const updatedLogs = await getAllLogs();
        setLogs(updatedLogs);
        // Stay on the input page (last page)
        setCurrentPageIndex(updatedLogs.length);
    };

    const handleJumpToInput = () => {
        setCurrentPageIndex(logs.length);
    };

    // Keyboard navigation (only in notebook mode)
    useEffect(() => {
        if (mode !== 'notebook') return;

        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setCurrentPageIndex(prev => prev > 0 ? prev - 1 : prev);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                setCurrentPageIndex(prev => prev < logs.length ? prev + 1 : prev);
            } else if (e.key === 'Home') {
                setCurrentPageIndex(0);
            } else if (e.key === 'End') {
                setCurrentPageIndex(logs.length);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [mode, logs.length]);

    const totalPages = logs.length + 1; // +1 for input page
    const isInputPage = currentPageIndex === logs.length;
    const currentLog = currentPageIndex < logs.length ? logs[currentPageIndex] : undefined;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors">
            {/* Top Bar with Calendar Toggle and Navigation */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMode('notebook')}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                            mode === 'notebook'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        📓 Notebook
                    </button>
                    <button
                        onClick={() => setMode('chat')}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                            mode === 'chat'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        💬 Chat
                    </button>
                    {mode === 'notebook' && (
                        <>
                            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                            >
                                📅 Calendar
                            </button>
                            <button
                                onClick={handleJumpToInput}
                                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                            >
                                ✍️ New Entry
                            </button>
                        </>
                    )}
                </div>
                {mode === 'notebook' && (
                    <PageNavigation
                        currentPage={currentPageIndex + 1}
                        totalPages={totalPages}
                        onNext={handleNextPage}
                        onPrev={handlePrevPage}
                        canGoNext={currentPageIndex < logs.length}
                        canGoPrev={currentPageIndex > 0}
                    />
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {mode === 'chat' ? (
                    <ChatPage onBack={() => setMode('notebook')} />
                ) : (
                    <>
                        {/* Calendar Sidebar */}
                        {showCalendar && (
                            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                                <CalendarIndex
                                    onDateSelect={handleDateSelect}
                                    currentDate={selectedDate}
                                />
                            </div>
                        )}

                        {/* Notebook Page Container */}
                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                            <div className="notebook-container w-full max-w-4xl h-full relative">
                                {/* Page Flip Animation Container */}
                                <div
                                    className="h-full w-full relative transition-transform duration-300"
                                    style={{
                                        transform: `perspective(1000px) rotateY(0deg)`,
                                    }}
                                >
                                    {isInputPage ? (
                                        <NotebookPage
                                            pageNumber={totalPages}
                                            isInputPage={true}
                                        >
                                            <LogInputPage
                                                onLogSaved={handleLogSaved}
                                            />
                                        </NotebookPage>
                                    ) : (
                                        <NotebookPage
                                            log={currentLog}
                                            pageNumber={currentPageIndex + 1}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


'use client'

import { LogEntry } from '@/src/actions/getLogs';

type NotebookPageProps = {
    log?: LogEntry;
    pageNumber: number;
    isInputPage?: boolean;
    children?: React.ReactNode; // For input page content
};

export default function NotebookPage({ log, pageNumber, isInputPage, children }: NotebookPageProps) {
    const formatDate = (date: Date) => {
        const d = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        let hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    };

    return (
        <div className="notebook-page bg-gradient-to-b from-amber-50 to-amber-40 shadow-lg relative h-full w-full">
            {/* Notebook Paper Texture */}
            <div 
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `
                        repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 31px,
                            rgba(0,0,0,0.05) 31px,
                            rgba(0,0,0,0.05) 32px
                        )
                    `,
                }}
            />

            {/* Page Content */}
            <div className="relative z-10 p-8 h-full flex flex-col">
                {/* Header with Date and Page Number */}
                <div className="flex justify-between items-start mb-6 border-b border-gray-300 dark:border-gray-600 pb-2">
                    <div>
                        {log && (
                            <>
                                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    {formatDate(log.createdAt)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatTime(log.createdAt)}
                                </div>
                            </>
                        )}
                        {isInputPage && (
                            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {formatDate(new Date())}
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        Page {pageNumber}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    {isInputPage && children ? (
                        // Input page - render children (PocketBrain input)
                        <div className="h-full">
                            {children}
                        </div>
                    ) : log ? (
                        // Display log entry
                        <div className="space-y-4">
                            {/* Domain and Activity */}
                            {(log.domainName || log.activityName) && (
                                <div className="flex gap-2 flex-wrap">
                                    {log.domainName && (
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            log.activityName === 'Chat' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {log.domainName}
                                        </span>
                                    )}
                                    {log.activityName && (
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            log.activityName === 'Chat' 
                                                ? 'bg-green-200 text-green-900' 
                                                : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {log.activityName === 'Chat' ? '💬 Chat' : log.activityName}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Main Description */}
                            <div className={`text-lg leading-relaxed font-serif ${
                                log.activityName === 'Chat' 
                                    ? 'bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-400 dark:border-green-500 text-gray-800 dark:text-gray-100' 
                                    : 'text-gray-800 dark:text-gray-100'
                            }`}>
                                {log.description}
                            </div>

                            {/* Show chat message content if it's a chat */}
                            {log.metadata && typeof log.metadata === 'object' && 'isChatMessage' in log.metadata && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                        Chat Message ({log.metadata.chatRole === 'user' ? '👤 User' : '🤖 AI'})
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {log.content || log.userInput}
                                    </div>
                                </div>
                            )}

                            {/* Original User Input (if different and not a chat) */}
                            {log.userInput !== log.description && !(log.metadata && typeof log.metadata === 'object' && 'isChatMessage' in log.metadata) && (
                                <div className="text-gray-600 dark:text-gray-400 text-sm italic border-l-4 border-gray-300 dark:border-gray-600 pl-4">
                                    &ldquo;{log.userInput}&rdquo;
                                </div>
                            )}

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mood</div>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {log.moodScore}/10
                                    </div>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Energy</div>
                                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {log.energyLevel}/10
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Productivity</div>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {log.productivityScore}/10
                                    </div>
                                </div>
                            </div>

                            {/* Additional Context */}
                            <div className="mt-6 space-y-2 text-sm text-gray-600">
                                {log.location && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">📍 Location:</span>
                                        <span>{log.location}</span>
                                    </div>
                                )}
                                {log.timeOfDay && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">🕐 Time:</span>
                                        <span className="capitalize">{log.timeOfDay}</span>
                                    </div>
                                )}
                                {log.durationMinutes && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">⏱️ Duration:</span>
                                        <span>{log.durationMinutes} minutes</span>
                                    </div>
                                )}
                                {log.amount && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">💰 Amount:</span>
                                        <span>
                                            {log.currency || 'INR'} {log.amount}
                                        </span>
                                    </div>
                                )}
                                {log.sentiment && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">😊 Sentiment:</span>
                                        <span className="capitalize">{log.sentiment}</span>
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                        Additional Details:
                                    </div>
                                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Empty page
                        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            Empty page
                        </div>
                    )}
                </div>

                {/* Footer Line (notebook style) */}
                <div className="mt-4 pt-2 border-t border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Life Operating System
                </div>
            </div>

            {/* Spiral Binding Effect (left side) */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-gray-300 to-transparent" />
        </div>
    );
}


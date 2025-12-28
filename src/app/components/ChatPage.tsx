'use client'

import { useState } from 'react';
import { getRelatedLogs } from '@/src/actions/getMemory';
import { getRecentLogs } from '@/src/actions/getLogs';
import { saveChatMessage } from '@/src/actions/saveChat';
import { useMLCEngine } from './MLCEngineProvider';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

type ProcessStep = {
    step: string;
    status: 'pending' | 'processing' | 'completed' | 'skipped';
    details?: string;
};

type ChatPageProps = {
    onBack?: () => void;
};

export default function ChatPage({ onBack }: ChatPageProps) {
    const { engine, isLoading, initializeEngine } = useMLCEngine();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [processing, setProcessing] = useState(false);
    const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

    // Extract keywords from user message
    const extractKeywords = (userMessage: string): string[] => {
        // Common words to exclude
        const commonWords = ['the', 'was', 'were', 'this', 'that', 'with', 'from', 'have', 'has', 'had', 'what', 'when', 'where', 'how', 'why', 'did', 'do', 'does', 'about', 'last', 'week', 'month', 'year', 'day', 'time', 'tell', 'me', 'you', 'your', 'my', 'i', 'am', 'is', 'are', 'can', 'could', 'would', 'should', 'will', 'shall'];
        
        // Extract meaningful keywords (words longer than 2 chars, excluding common words)
        const keywords = userMessage
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.includes(word));
        
        return keywords;
    };

    const handleSendMessage = async () => {
        if (!engine || !input.trim() || processing) return;

        const userMessage = input.trim();
        setInput("");
        setProcessing(true);
        setProcessSteps([]);

        // Add user message to chat
        const userMsg: Message = {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Step 1: Extract keywords
            setProcessSteps([{ step: 'Extracting keywords...', status: 'processing' }]);
            const searchKeywords = extractKeywords(userMessage);
            
            setProcessSteps([
                { step: 'Extracting keywords...', status: 'completed', details: searchKeywords.length > 0 ? `Keywords: ${searchKeywords.join(', ')}` : 'No specific keywords' },
                { step: 'Searching database...', status: 'processing' }
            ]);

            // Step 2: Always search database using keywords
            const searchQuery = searchKeywords.length > 0 ? searchKeywords.join(' ') : userMessage;
            const searchResults = await getRelatedLogs(searchQuery) || [];

            setProcessSteps([
                { step: 'Extracting keywords...', status: 'completed', details: searchKeywords.length > 0 ? `Keywords: ${searchKeywords.join(', ')}` : 'No specific keywords' },
                { step: 'Searching database...', status: 'completed', details: `Found ${searchResults.length} matching logs` },
                { step: 'Fetching recent logs...', status: 'processing' }
            ]);

            // Step 3: Always fetch recent logs
            // If search found results: get last 2 days, else get last 3 days
            const recentDays = searchResults.length > 0 ? 2 : 3;
            const recentLogs = await getRecentLogs(recentDays);

            setProcessSteps(prev => [
                ...prev.slice(0, -1),
                { step: 'Fetching recent logs...', status: 'completed', details: `Found ${recentLogs.length} logs from last ${recentDays} days` }
            ]);

            // Step 4: Combine search results with recent logs (avoid duplicates)
            const searchResultIds = new Set(searchResults.map((r) => {
                const id = r.id || (r.date ? (typeof r.date === 'string' ? new Date(r.date).getTime() : r.date.getTime()) : 0);
                return id;
            }));
            const uniqueRecentLogs = recentLogs.filter(log => {
                const logId = log.id || (log.createdAt ? new Date(log.createdAt).getTime() : 0);
                return !searchResultIds.has(logId);
            });

            // Convert recent logs to same format as search results
            const formattedRecentLogs = uniqueRecentLogs.map(log => ({
                id: log.id,
                date: log.createdAt,
                domain: log.domainName || null,
                activity: log.activityName || null,
                description: log.description || log.content,
                moodScore: log.moodScore,
                energyLevel: log.energyLevel,
                productivityScore: log.productivityScore,
                metadata: log.metadata,
            }));

            // Combine: search results first, then recent logs
            const contextLogs = [...searchResults, ...formattedRecentLogs];

            // Step 5: Generate response with context
            setProcessSteps(prev => [
                ...prev,
                { step: 'Generating response...', status: 'processing' }
            ]);

            const contextBlock = contextLogs.length > 0
                ? "RELEVANT LOGS FROM DATABASE:\n" + contextLogs.map((l) => {
                    const logInfo = [
                        l.domain ? `Domain: ${l.domain}` : '',
                        l.activity ? `Activity: ${l.activity}` : '',
                        `Description: ${l.description}`,
                        l.moodScore ? `Mood: ${l.moodScore}/10` : '',
                        l.energyLevel ? `Energy: ${l.energyLevel}/10` : '',
                        l.productivityScore ? `Productivity: ${l.productivityScore}/10` : '',
                        l.date ? `Date: ${new Date(l.date).toLocaleDateString()}` : '',
                    ].filter(Boolean).join(', ');
                    return `- ${logInfo}`;
                }).join("\n")
                : "";

            // Include recent chat messages in context (last 4 messages for conversation continuity)
            const recentChatContext = messages.slice(-4).map(m => 
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            ).join('\n');

            const responsePrompt = `You are a helpful AI assistant with access to the user's personal log database.

${contextBlock ? `${contextBlock}\n\n` : ''}${recentChatContext ? `RECENT CONVERSATION:\n${recentChatContext}\n\n` : ''}User Question: "${userMessage}"

Answer the user's question using the context from their logs when relevant. Be conversational, helpful, and insightful. Pay attention to the recent conversation context to maintain continuity. If the context doesn't fully answer the question, you can still provide a helpful response based on general knowledge.`;

            const response = await engine.chat.completions.create({
                messages: [
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                    { role: "user", content: responsePrompt }
                ],
                stream: true,
            });

            setProcessSteps(prev => [
                ...prev.slice(0, -1),
                { step: 'Generating response...', status: 'completed' }
            ]);

            // Stream the response
            let assistantReply = "";
            const assistantMsg: Message = {
                role: 'assistant',
                content: "",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);

            for await (const chunk of response) {
                const delta = chunk.choices[0]?.delta.content || "";
                assistantReply += delta;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        ...assistantMsg,
                        content: assistantReply
                    };
                    return newMessages;
                });
            }

            // Save both user message and assistant response to database
            try {
                // Save user message
                await saveChatMessage(
                    userMsg,
                    messages.slice(-3) // Last 3 messages as context
                );

                // Save assistant response
                const finalAssistantMsg: Message = {
                    role: 'assistant',
                    content: assistantReply,
                    timestamp: new Date()
                };
                await saveChatMessage(
                    finalAssistantMsg,
                    [...messages.slice(-3), userMsg] // Include user message in context
                );
            } catch (error) {
                console.error('Failed to save chat messages:', error);
                // Don't block the UI if saving fails
            }

        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                role: 'assistant',
                content: "Sorry, I encountered an error. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setProcessing(false);
            setProcessSteps([]);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-800">💬 Chat with Your Database</h2>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                        ← Back to Notebook
                    </button>
                )}
            </div>

            {/* Process Steps (when processing) */}
            {processSteps.length > 0 && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-blue-50 dark:bg-blue-900/30">
                    <div className="space-y-2">
                        {processSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                {step.status === 'processing' && (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                )}
                                {step.status === 'completed' && (
                                    <span className="text-green-600">✓</span>
                                )}
                                {step.status === 'skipped' && (
                                    <span className="text-gray-400">⊘</span>
                                )}
                                {step.status === 'pending' && (
                                    <span className="text-gray-400">○</span>
                                )}
                                <span className={step.status === 'processing' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                    {step.step}
                                </span>
                                {step.details && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({step.details})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p className="text-lg mb-2">Start a conversation!</p>
                        <p className="text-sm">Ask about your past logs, mood trends, or just chat casually.</p>
                        <p className="text-xs mt-2 text-gray-400 dark:text-gray-500">Examples:</p>
                        <ul className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-y-1">
                            <li>&quot;How was my mood last week?&quot;</li>
                            <li>&quot;What did I do yesterday?&quot;</li>
                            <li>&quot;Show me logs about coding&quot;</li>
                            <li>&quot;Tell me a joke&quot;</li>
                        </ul>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                                msg.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                {msg.timestamp.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Engine Status */}
            {!engine && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">AI Engine not initialized</span>
                        <button
                            onClick={initializeEngine}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? "Loading..." : "Initialize Engine"}
                        </button>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="flex-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        disabled={!engine || processing}
                        rows={2}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!engine || !input.trim() || processing}
                        className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? "..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}


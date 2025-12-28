'use client'

import { useState } from 'react';
import { getRelatedLogs } from '@/src/actions/getMemory';
import { saveLogEntry } from '@/src/actions/saveLog';
import { useMLCEngine } from './MLCEngineProvider';

type LogInputPageProps = {
    onLogSaved: () => void;
};

export default function LogInputPage({ onLogSaved }: LogInputPageProps) {
    const { engine, status, progress, isDownloading, isLoading, initializeEngine } = useMLCEngine();
    const [input, setInput] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string>("");

    const handleSmartLog = async () => {
        if (!engine || !input.trim() || saving) return;

        const userText = input;
        setInput("");
        setSaving(true);
        setSaveStatus("🧠 Recalling History...");

        try {
            const pastLogs = await getRelatedLogs(userText) || [];

            const memoryBlock = pastLogs.length > 0
                ? "RELEVANT PAST LOGS:\n" + pastLogs.map(l => {
                    const logInfo = [
                        l.domain ? `Domain: ${l.domain}` : '',
                        l.activity ? `Activity: ${l.activity}` : '',
                        `Description: ${l.description}`,
                        l.moodScore ? `Mood: ${l.moodScore}/10` : '',
                        l.energyLevel ? `Energy: ${l.energyLevel}/10` : '',
                        l.productivityScore ? `Productivity: ${l.productivityScore}/10` : '',
                        l.metadata ? `Metadata: ${JSON.stringify(l.metadata)}` : '',
                    ].filter(Boolean).join(', ');
                    return `- [${l.date}]: ${logInfo}`;
                }).join("\n")
                : "No relevant past logs found.";

            setSaveStatus("🤔 Analyzing...");

            const prompt = `
    CONTEXT FROM DATABASE:
    ${memoryBlock}

    USER INPUT: "${userText}"

    TASK: Analyze the user input and create a structured log entry.

    ⚠️ CRITICAL: ABSOLUTELY NO NULL VALUES ALLOWED. ALL FIELDS MUST BE PROVIDED.

    STRICT OUTPUT FORMAT - ALL FIELDS REQUIRED:
    You MUST return a JSON object that strictly adheres to this structure with NO NULL VALUES:
    {
        "log": {
            "description": "String (REQUIRED - A concise summary of the event or the user's input)",
            "user_input": "String (REQUIRED - MUST be the original user text exactly as provided)"
        },
        "classification": {
            "domain": "String (REQUIRED - MUST be one of: 'Work', 'Health', 'Finance', 'Social', 'Growth', 'Leisure', 'General')",
            "activity": "String (REQUIRED - Specific activity within the domain, e.g., 'Coding', 'Sleep', 'SIP', 'Friends', 'Learning', 'Exercise', 'Meal', etc.)"
        },
        "metadata": {
            "Object with activity-specific data (REQUIRED - extract relevant details based on activity type, can be empty {})"
        },
        "action": {
            "action": "String (REQUIRED - e.g., 'acknowledge', 'question', 'insight', 'reminder')", 
            "priority": "String (REQUIRED - MUST be 'low', 'medium', or 'high')"
        },
        "context": {
            "relevant_context": "String (REQUIRED - How the database context relates, use 'None' if no context)"
        },
        "moodScore": Number (REQUIRED - MUST be integer 1-10: 1=Depressed, 10=Ecstatic),
        "energyLevel": Number (REQUIRED - MUST be integer 1-10: 1=Exhausted, 10=Hyper),
        "productivityScore": Number (REQUIRED - MUST be integer 1-10: 1=Unproductive, 10=Very Productive),
        "location": "String (Optional - e.g., 'Home', 'Office', 'Gym', 'Coffee Shop')",
        "timeOfDay": "String (Optional - 'morning', 'afternoon', 'evening', 'night')",
        "durationMinutes": Number (Optional - if activity has a duration),
        "amount": Number (Optional - ONLY for financial transactions, in base currency),
        "currency": "String (Optional - ONLY if amount is provided, default is 'INR' if not specified)",
        "sentiment": "String (Optional - 'positive', 'negative', 'neutral')"
    }

    MANDATORY RULES - NO EXCEPTIONS:
    
    1. HIERARCHICAL CLASSIFICATION (REQUIRED):
       - "classification.domain" is REQUIRED - Classify into major life area
       - "classification.activity" is REQUIRED - Be SPECIFIC within the domain
    
    2. METADATA EXTRACTION (REQUIRED):
       - Extract activity-specific details into "metadata" object
       - If no specific metadata applies, use empty object: {}
    
    3. CORE FIELDS:
       - "log.description" is REQUIRED - concise summary
       - "log.user_input" is REQUIRED - exact original text
       - "action.action" is REQUIRED
       - "action.priority" is REQUIRED - 'low', 'medium', or 'high'
       - "context.relevant_context" is REQUIRED - use 'None' if no context
    
    4. UNIVERSAL METRICS (REQUIRED - integers 1-10):
       - "moodScore" - ALWAYS infer from tone and words
       - "energyLevel" - ALWAYS infer from activity and description
       - "productivityScore" - ALWAYS infer from activity type and outcome
    
    5. CONTEXTUAL DATA (Only include if RELEVANT, otherwise omit or use null):
       - "location" - Only if location is mentioned
       - "timeOfDay" - Only if time context is clear
       - "durationMinutes" - Only if duration is mentioned
       - "amount" + "currency" - ONLY for financial transactions
       - "sentiment" - Only if clearly positive/negative/neutral
    
    6. Return ONLY the raw JSON. Do not use Markdown code blocks (like \`\`\`json).
    
    ⚠️ REMEMBER: NULL VALUES ARE STRICTLY FORBIDDEN. Use safe defaults if uncertain.
`;

            const response = await engine.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                stream: false,
                response_format: { type: "json_object" }
            });

            const rawJson = response.choices[0].message.content;

            if (rawJson) {
                const logData = JSON.parse(rawJson);

                setSaveStatus("💾 Saving...");
                const result = await saveLogEntry(logData);

                if (result.success) {
                    setSaveStatus("✅ Saved!");
                    setTimeout(() => {
                        setSaveStatus("");
                        onLogSaved();
                    }, 1000);
                } else {
                    setSaveStatus(`❌ Error: ${result.error}`);
                }
            }
        } catch (e) {
            console.error(e);
            setSaveStatus("❌ Error: Failed to process log.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Status Bar */}
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-xs font-mono font-black border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between mb-1 text-gray-500 dark:text-gray-400">
                    <span>{saveStatus || status}</span>
                    {!saveStatus && <span>{Math.round(progress * 100)}%</span>}
                </div>
                {!saveStatus && progress > 0 && progress < 1 && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                    </div>
                )}
            </div>

            {/* Load Button */}
            {!engine && (
                <button 
                    onClick={initializeEngine}
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading 
                        ? (isDownloading ? "Downloading Model..." : "Loading from cache...")
                        : "Initialize Engine (2GB - Cached if available)"
                    }
                </button>
            )}

            {/* Input Area */}
            <div className="flex-1 flex flex-col gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSmartLog();
                        }
                    }}
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-300 dark:border-gray-600 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none font-serif text-lg"
                    placeholder="Write your log entry here... (Cmd/Ctrl + Enter to save)"
                    disabled={!engine || saving}
                />
                <button
                    onClick={handleSmartLog}
                    disabled={!engine || !input.trim() || saving}
                    className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-3 rounded-lg disabled:opacity-50 font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                >
                    {saving ? "Saving..." : "💾 Save Log"}
                </button>
            </div>
        </div>
    );
}


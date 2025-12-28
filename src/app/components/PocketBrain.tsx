'use client'
import { useState, useRef } from 'react';
import { CreateMLCEngine, MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";
import { getRelatedLogs } from '@/src/actions/getMemory';
import { saveLogEntry } from '@/src/actions/saveLog';
// Check your import paths here (Next.js usually uses @/...)


const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

export default function PocketBrain() {
    const [status, setStatus] = useState<string>("Ready to Load");
    const [progress, setProgress] = useState<number>(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [mode, setMode] = useState<"chat" | "log">("chat");

    const engineRef = useRef<MLCEngineInterface | null>(null);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const startTimeRef = useRef<number>(0);

    const loadBrain = async () => {
        startTimeRef.current = Date.now();
        setStatus("Initializing...");
        setProgress(0);
        setIsDownloading(false);
        
        try {
            engineRef.current = await CreateMLCEngine(MODEL_ID, {
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
            setStatus("Brain is Online 🧠");
            setProgress(1);
            setIsDownloading(false);
        } catch (error) {
            console.error(error);
            setStatus("Error (Check GPU)");
            setIsDownloading(false);
        }
    };

    // --- LOGIC 1: Standard Chat ---
    const sendChatMessage = async () => {
        if (!engineRef.current || !input.trim()) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setStatus("Thinking...");

        try {
            const chunks = await engineRef.current.chat.completions.create({
                messages: [...messages, userMsg],
                stream: true,
            });

            let reply = "";
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            for await (const chunk of chunks) {
                const delta = chunk.choices[0]?.delta.content || "";
                reply += delta;
                setMessages((prev) => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: "assistant", content: reply };
                    return newHistory;
                });
            }
            setStatus("Ready");
        } catch (error) {
            console.error(error);
            setStatus("Error during inference");
        }
    };

    // --- LOGIC 2: The "Smart" RAG Logger ---
    const handleSmartLog = async () => {
        if (!engineRef.current || !input.trim()) return;

        // 1. Capture Input & Update UI
        const userText = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: `📝 LOG: ${userText}` }]);

        setStatus("🧠 Recalling History...");

        try {
            // 2. RAG Step: Fetch Context from Backend
            // (Note: Make sure your API returns an array, even if empty)
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

            setStatus("🤔 Analyzing...");

            // 3. The Prompt
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
       - "classification.domain" is REQUIRED - Classify into major life area:
         * "Work" - Job, projects, career, professional development
         * "Health" - Physical health, exercise, sleep, nutrition, medical
         * "Finance" - Money, investments, spending, earnings, budgets
         * "Social" - Friends, family, relationships, networking, events
         * "Growth" - Learning, skills, personal development, education
         * "Leisure" - Hobbies, entertainment, relaxation, fun activities
         * "General" - If truly unclear, use this as fallback
       
       - "classification.activity" is REQUIRED - Be SPECIFIC within the domain:
         * Work: "Coding", "Meeting", "Planning", "Learning", "Review", "Deployment"
         * Health: "Workout", "Sleep", "Meal", "Medication", "Therapy", "Checkup"
         * Finance: "Spending", "Investing", "SIP", "Salary", "Budget", "Expense"
         * Social: "Friends", "Family", "Dating", "Networking", "Event", "Call"
         * Growth: "Reading", "Course", "Practice", "Research", "Tutorial"
         * Leisure: "Gaming", "Movie", "Music", "Travel", "Sports", "Hobby"
    
    2. METADATA EXTRACTION (REQUIRED):
       - Extract activity-specific details into "metadata" object
       - Examples:
         * Work/Coding: { "language": "TypeScript", "lines_of_code": 500, "bugs_fixed": 2, "ticket_id": "PROJ-123", "project": "Tracker App" }
         * Health/Workout: { "exercise": "Bench Press", "weight_kg": 60, "reps": 10, "sets": 3, "duration_minutes": 45 }
         * Finance/Investing: { "amount": 5000, "type": "SIP", "ticker": "NIFTY50", "roi_expected": 12 }
         * Social/Friends: { "person_name": "John", "location": "Coffee Shop", "duration_minutes": 120, "topic": "Career" }
         * Health/Sleep: { "hours": 7.5, "quality": "good", "wake_time": "06:30" }
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
       - SCORING EXAMPLES:
         * "exhausted", "tired", "drained" → mood: 3-4, energy: 2-3, productivity: 4-5
         * "feeling good", "happy", "excited" → mood: 7-8, energy: 6-7, productivity: 6-7
         * "won", "solved", "completed" → mood: 8-9, energy: 7-8, productivity: 7-9
         * "bug", "failed", "stuck" → mood: 4-5, energy: 4-5, productivity: 3-4
         * Neutral → mood: 5, energy: 5, productivity: 5
    
    5. CONTEXTUAL DATA (Only include if RELEVANT, otherwise omit or use null):
       - "location" - Only if location is mentioned (e.g., "Coffee Shop", "Gym", "Home")
       - "timeOfDay" - Only if time context is clear (must be: 'morning', 'afternoon', 'evening', 'night')
       - "durationMinutes" - Only if duration is mentioned (e.g., "worked for 2 hours" = 120)
       - "amount" + "currency" - ONLY for financial transactions (default currency is INR if not specified)
       - "sentiment" - Only if clearly positive/negative/neutral (must be one of these three)
       
       ⚠️ IMPORTANT: Do NOT include fields that are not relevant to the log entry.
       - Emotional logs don't need currency, amount, or financial data
       - Work logs don't need workout metadata
       - Social logs don't need code-related metadata
       - If a field is not applicable, either omit it or set it to null (not empty string)
    
    6. VALIDATION CHECKLIST:
       - All strings are non-empty
       - All numbers are integers 1-10 (for scores)
       - Domain is one of: Work, Health, Finance, Social, Growth, Leisure, General
       - Activity is specific and relevant to domain
       - Metadata is an object (can be empty {})
       - Priority is 'low', 'medium', or 'high'
    
    7. Return ONLY the raw JSON. Do not use Markdown code blocks (like \`\`\`json).
    
    ⚠️ REMEMBER: NULL VALUES ARE STRICTLY FORBIDDEN. Use safe defaults if uncertain.
`;

            // 4. Inference
            const response = await engineRef.current.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                stream: false,
                response_format: { type: "json_object" }
            });

            const rawJson = response.choices[0].message.content;

            if (rawJson) {
                const logData = JSON.parse(rawJson);

                // 5. Save to Backend
                setStatus("💾 Saving...");
                const result = await saveLogEntry(logData);

                if (result.success) {
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `✅ Saved: ${JSON.stringify(logData, null, 2)}`
                    }]);
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: `❌ DB Error: ${result.error}` }]);
                }
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: Failed to process log.` }]);
        }
        setStatus("Ready");
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-4 font-sans flex flex-col h-screen">
            <h2 className="text-xl font-bold">Local Android AI</h2>

            {/* Status Bar */}
            <div className="bg-black p-3 rounded-md text-xs font-mono border border-gray-200">
                <div className="flex justify-between mb-1">
                    <span>{status}</span>
                    <span>{Math.round(progress * 100)}%</span>
                </div>
                {progress > 0 && progress < 1 && (
                    <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                    </div>
                )}
            </div>

            {/* Load Button */}
            {!engineRef.current && (
                <button onClick={loadBrain} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    Initialize Engine {isDownloading ? "(Downloading...)" : "(2GB - Cached if available)"}
                </button>
            )}

            {/* Mode Toggle */}
            {engineRef.current && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setMode("chat")}
                        className={`flex-1 py-1 px-3 rounded-md text-sm font-semibold transition-colors ${mode === "chat" ? "bg-white shadow text-blue-600" : "text-gray-500"}`}
                    >
                        Chat Mode
                    </button>
                    <button
                        onClick={() => setMode("log")}
                        className={`flex-1 py-1 px-3 rounded-md text-sm font-semibold transition-colors ${mode === "log" ? "bg-white shadow text-purple-600" : "text-gray-500"}`}
                    >
                        Smart Logger
                    </button>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white space-y-3 shadow-inner font-mono text-xs">
                {messages.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-800 mr-auto'}`}>
                        {msg.content}
                    </div>
                ))}
            </div>

            {/* Input Area - NOW CORRECTLY WIRED */}
            <div className="flex gap-2 pb-4">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    // FIX: This ternary now calls the correct function based on mode
                    onKeyDown={(e) => e.key === 'Enter' && (mode === "chat" ? sendChatMessage() : handleSmartLog())}
                    className="flex-1 bg-black border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={mode === "chat" ? "Chat with Llama..." : "Log: 'Knee hurts again'"}
                    disabled={!engineRef.current}
                />
                <button
                    // FIX: This ternary now calls the correct function based on mode
                    onClick={mode === "chat" ? sendChatMessage : handleSmartLog}
                    disabled={!engineRef.current}
                    className={`${mode === "chat" ? "bg-green-600" : "bg-purple-600"} text-white px-4 rounded-lg disabled:opacity-50 font-semibold`}
                >
                    {mode === "chat" ? "Send" : "Log"}
                </button>
            </div>
        </div>
    );
}
'use server'

import { db } from '../db';
import { logs, domains, activities } from '../db/schema';
import { eq } from 'drizzle-orm';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

// Save a chat message as a log entry
export async function saveChatMessage(
    message: ChatMessage,
    conversationContext?: ChatMessage[] // Recent messages for context
) {
    try {
        // Get or create "Chat" domain
        let chatDomain = await db.select().from(domains).where(eq(domains.name, 'General')).limit(1);
        if (chatDomain.length === 0) {
            const [newDomain] = await db.insert(domains).values({ name: 'General' }).returning();
            chatDomain = [newDomain];
        }
        const domainId = chatDomain[0].id;

        // Get or create "Chat" activity
        let chatActivity = await db.select().from(activities).where(
            eq(activities.name, 'Chat')
        ).limit(1);
        if (chatActivity.length === 0) {
            const [newActivity] = await db.insert(activities).values({
                name: 'Chat',
                domainId: domainId,
            }).returning();
            chatActivity = [newActivity];
        }
        const activityId = chatActivity[0].id;

        // Build metadata with conversation context
        const metadata: Record<string, unknown> = {
            chatRole: message.role,
            isChatMessage: true,
        };

        if (conversationContext && conversationContext.length > 0) {
            metadata.conversationContext = conversationContext.map(m => ({
                role: m.role,
                content: m.content.substring(0, 200), // Limit context length
                timestamp: m.timestamp,
            }));
        }

        // For chat messages, use neutral scores (5) as defaults
        const insertData = {
            content: message.content,
            description: message.role === 'user' 
                ? `User chat: ${message.content.substring(0, 100)}`
                : `AI response: ${message.content.substring(0, 100)}`,
            userInput: message.content,
            domainId: domainId,
            activityId: activityId,
            moodScore: 5, // Neutral for chat
            energyLevel: 5,
            productivityScore: 5,
            metadata: metadata,
            priority: 'low',
            aiAction: message.role === 'user' ? 'question' : 'insight',
        };

        await db.insert(logs).values(insertData);

        return { success: true };
    } catch (error) {
        console.error("Save chat message failed:", error);
        return { success: false, error: "Failed to save chat message" };
    }
}


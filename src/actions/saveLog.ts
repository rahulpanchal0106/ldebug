'use server'

import { db } from '../db';
import { logs, domains, activities } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Enhanced type matching the AI response structure with hierarchical classification
type IncomingLogData = {
    log: {
        description: string;
        user_input: string;
    };
    classification?: {
        domain?: string; // "Work", "Health", "Finance", "Social", "Growth", "Leisure"
        activity?: string; // "Coding", "Sleep", "SIP", "Friends", etc.
    };
    metadata?: Record<string, unknown>; // Activity-specific data
    context?: Record<string, unknown>;
    action?: {
        action?: string;
        priority?: string;
    };
    // Universal metrics
    moodScore?: number;
    energyLevel?: number;
    productivityScore?: number;
    stressLevel?: number;
    satisfactionScore?: number;
    // Additional context
    location?: string;
    timeOfDay?: string;
    durationMinutes?: number;
    amount?: number;
    currency?: string;
    sentiment?: string;
    relatedLogIds?: number[];
    goalId?: number;
};

// Helper: Get or create domain
async function getOrCreateDomain(domainName: string) {
    const normalized = domainName.trim().toLowerCase();
    const capitalized = domainName.trim().charAt(0).toUpperCase() + domainName.trim().slice(1).toLowerCase();
    
    // Try to find existing domain
    const existing = await db.select().from(domains).where(eq(domains.name, capitalized)).limit(1);
    
    if (existing.length > 0) {
        return existing[0].id;
    }
    
    // Create new domain with default color
    const domainColors: Record<string, string> = {
        'work': '#3B82F6',
        'health': '#EF4444',
        'finance': '#F59E0B',
        'social': '#10B981',
        'growth': '#8B5CF6',
        'leisure': '#EC4899',
        'general': '#6B7280',
    };
    
    const [newDomain] = await db.insert(domains).values({
        name: capitalized,
        color: domainColors[normalized] || '#6B7280',
        isActive: true,
    }).returning();
    
    return newDomain.id;
}

// Helper: Get or create activity
async function getOrCreateActivity(activityName: string, domainId: number) {
    const normalized = activityName.trim();
    
    // Try to find existing activity in this domain
    const existing = await db.select()
        .from(activities)
        .where(and(
            eq(activities.name, normalized),
            eq(activities.domainId, domainId)
        ))
        .limit(1);
    
    if (existing.length > 0) {
        return existing[0].id;
    }
    
    // Create new activity
    const [newActivity] = await db.insert(activities).values({
        name: normalized,
        domainId: domainId,
        isActive: true,
    }).returning();
    
    return newActivity.id;
}

export async function saveLogEntry(data: IncomingLogData) {
    try {
        console.log("Attempting to save:", JSON.stringify(data, null, 2));

        // Extract and validate core fields
        let description = data.log?.description?.trim() || '';
        let userInput = data.log?.user_input?.trim() || '';

        // Fallbacks for required fields
        if (!description || description === '') {
            description = userInput || 'No description provided';
        }
        if (!userInput || userInput === '') {
            userInput = description;
        }

        // Handle hierarchical classification
        const domainName = data.classification?.domain || 'General';
        const activityName = data.classification?.activity || 'General';
        
        const domainId = await getOrCreateDomain(domainName);
        const activityId = await getOrCreateActivity(activityName, domainId);

        // Extract and validate scores with fallbacks
        let moodScore = data.moodScore;
        let energyLevel = data.energyLevel;
        let productivityScore = data.productivityScore;

        // Infer scores from description if missing
        if (moodScore === null || moodScore === undefined) {
            const desc = description.toLowerCase();
            if (desc.includes('exhausted') || desc.includes('tired') || desc.includes('guilty') || desc.includes('sad') || desc.includes('depressed')) {
                moodScore = 3;
            } else if (desc.includes('good') || desc.includes('happy') || desc.includes('won') || desc.includes('excited') || desc.includes('great')) {
                moodScore = 8;
            } else if (desc.includes('okay') || desc.includes('fine') || desc.includes('normal')) {
                moodScore = 6;
            } else {
                moodScore = 5;
            }
        }

        if (energyLevel === null || energyLevel === undefined) {
            const desc = description.toLowerCase();
            if (desc.includes('exhausted') || desc.includes('tired') || desc.includes('drained') || desc.includes('worn out')) {
                energyLevel = 2;
            } else if (desc.includes('energetic') || desc.includes('excited') || desc.includes('active') || desc.includes('pumped')) {
                energyLevel = 8;
            } else {
                energyLevel = 5;
            }
        }

        if (productivityScore === null || productivityScore === undefined) {
            const desc = description.toLowerCase();
            if (desc.includes('working') || desc.includes('solved') || desc.includes('completed') || desc.includes('won') || desc.includes('finished')) {
                productivityScore = 8;
            } else if (desc.includes('bug') || desc.includes('couldn\'t') || desc.includes('failed') || desc.includes('stuck')) {
                productivityScore = 3;
            } else {
                productivityScore = 5;
            }
        }

        // Clamp and round scores
        moodScore = Math.round(Math.max(1, Math.min(10, moodScore)));
        energyLevel = Math.round(Math.max(1, Math.min(10, energyLevel)));
        productivityScore = Math.round(Math.max(1, Math.min(10, productivityScore)));

        // Handle optional scores
        let stressLevel = data.stressLevel;
        if (stressLevel !== null && stressLevel !== undefined) {
            stressLevel = Math.round(Math.max(1, Math.min(10, stressLevel)));
        }

        let satisfactionScore = data.satisfactionScore;
        if (satisfactionScore !== null && satisfactionScore !== undefined) {
            satisfactionScore = Math.round(Math.max(1, Math.min(10, satisfactionScore)));
        }

        // Build metadata object (activity-specific data)
        // Only include metadata if it has actual content, otherwise use null
        let metadata: Record<string, unknown> | null = null;
        
        if (data.metadata && Object.keys(data.metadata).length > 0) {
            metadata = {
                ...data.metadata,
                // Add AI analysis context only if relevant
                aiAction: data.action?.action || 'acknowledge',
                aiPriority: data.action?.priority || 'medium',
            };
            
            // Only add context if it exists and is not empty
            if (data.context && Object.keys(data.context).length > 0) {
                metadata.aiContext = data.context;
            }
        } else if (data.action || data.context) {
            // If no metadata but we have action/context, create minimal metadata
            metadata = {
                aiAction: data.action?.action || 'acknowledge',
                aiPriority: data.action?.priority || 'medium',
            };
            if (data.context && Object.keys(data.context).length > 0) {
                metadata.aiContext = data.context;
            }
        }

        // Build insert data - only include fields that have actual values
        const insertData: {
            content: string;
            description: string;
            userInput: string;
            domainId: number;
            activityId: number;
            moodScore: number;
            energyLevel: number;
            productivityScore: number;
            stressLevel?: number | null;
            satisfactionScore?: number | null;
            metadata?: Record<string, unknown> | null;
            location?: string | null;
            timeOfDay?: string | null;
            durationMinutes?: number | null;
            amount?: string | null;
            currency?: string | null;
            sentiment?: string | null;
            priority?: string;
            relatedLogIds?: number[] | null;
            goalId?: number | null;
        } = {
            content: userInput, // Raw user input
            description: description,
            userInput: userInput,
            domainId: domainId,
            activityId: activityId,
            moodScore: moodScore,
            energyLevel: energyLevel,
            productivityScore: productivityScore,
            priority: data.action?.priority || 'medium',
        };

        // Only add optional fields if they have meaningful values, otherwise set to null or omit
        if (stressLevel !== null && stressLevel !== undefined) {
            insertData.stressLevel = stressLevel;
        } else {
            insertData.stressLevel = null;
        }

        if (satisfactionScore !== null && satisfactionScore !== undefined) {
            insertData.satisfactionScore = satisfactionScore;
        } else {
            insertData.satisfactionScore = null;
        }

        // Location - only if provided and not empty
        if (data.location && data.location.trim() !== '') {
            insertData.location = data.location.trim();
        } else {
            insertData.location = null;
        }

        // Time of day - only if provided and valid
        const validTimeOfDay = ['morning', 'afternoon', 'evening', 'night'];
        if (data.timeOfDay && validTimeOfDay.includes(data.timeOfDay.toLowerCase())) {
            insertData.timeOfDay = data.timeOfDay.toLowerCase();
        } else {
            insertData.timeOfDay = null;
        }

        // Duration - only if provided and > 0
        if (data.durationMinutes && data.durationMinutes > 0) {
            insertData.durationMinutes = data.durationMinutes;
        } else {
            insertData.durationMinutes = null;
        }

        // Financial fields - only if amount is provided (currency defaults to INR)
        if (data.amount && data.amount > 0) {
            insertData.amount = data.amount.toString();
            insertData.currency = (data.currency && data.currency.trim() !== '') ? data.currency.toUpperCase() : 'INR';
        } else {
            insertData.amount = null;
            insertData.currency = null;
        }

        // Sentiment - only if provided and valid
        const validSentiments = ['positive', 'negative', 'neutral'];
        if (data.sentiment && validSentiments.includes(data.sentiment.toLowerCase())) {
            insertData.sentiment = data.sentiment.toLowerCase();
        } else {
            insertData.sentiment = null;
        }

        // Related log IDs - only if array has items
        if (data.relatedLogIds && Array.isArray(data.relatedLogIds) && data.relatedLogIds.length > 0) {
            insertData.relatedLogIds = data.relatedLogIds;
        } else {
            insertData.relatedLogIds = null;
        }

        // Goal ID - only if provided
        if (data.goalId) {
            insertData.goalId = data.goalId;
        } else {
            insertData.goalId = null;
        }

        // Metadata - only if it has content
        if (metadata && Object.keys(metadata).length > 0) {
            insertData.metadata = metadata;
        } else {
            insertData.metadata = null;
        }

        await db.insert(logs).values(insertData);

        return { success: true, domainId, activityId };
    } catch (error) {
        console.error("Detailed DB Error:", error);
        return { success: false, error: "Database rejected the log" };
    }
}

'use server'

import { db } from '../db';
import { logs, domains, activities } from '../db/schema';
import { sql, desc, eq } from 'drizzle-orm';

export async function getRelatedLogs(userQuery: string) {
    try {
        // Clean the input for full-text search
        const searchTerms = userQuery
            .split(' ')
            .filter(w => w.length > 3)
            .join(' | ');

        if (!searchTerms) return [];

        // Perform semantic search with domain/activity context
        const relatedLogs = await db
            .select({
                id: logs.id,
                date: logs.createdAt,
                content: logs.content,
                description: logs.description,
                userInput: logs.userInput,
                domainName: domains.name,
                activityName: activities.name,
                moodScore: logs.moodScore,
                energyLevel: logs.energyLevel,
                productivityScore: logs.productivityScore,
                metadata: logs.metadata,
                location: logs.location,
                amount: logs.amount,
            })
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .leftJoin(activities, eq(logs.activityId, activities.id))
            .where(
                sql`to_tsvector('english', COALESCE(${logs.description}, '') || ' ' || COALESCE(${logs.userInput}, '') || ' ' || COALESCE(${logs.content}, '')) @@ to_tsquery('english', ${searchTerms})`
            )
            .orderBy(desc(logs.createdAt))
            .limit(5);

        // Format results with enhanced context
        return relatedLogs.map(log => ({
            id: log.id,
            date: log.date,
            content: log.content,
            description: log.description,
            userInput: log.userInput,
            domain: log.domainName || 'Unknown',
            activity: log.activityName || 'Unknown',
            moodScore: log.moodScore,
            energyLevel: log.energyLevel,
            productivityScore: log.productivityScore,
            metadata: log.metadata,
            location: log.location,
            amount: log.amount,
        }));

    } catch (error) {
        console.error("RAG Search Failed:", error);
        return [];
    }
}

// New function: Get logs by domain/activity for analytics
export async function getLogsByDomain(domainName: string, limit: number = 10) {
    try {
        const results = await db
            .select()
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .where(eq(domains.name, domainName))
            .orderBy(desc(logs.createdAt))
            .limit(limit);

        return results.map(r => r.logs);
    } catch (error) {
        console.error("Get logs by domain failed:", error);
        return [];
    }
}

// New function: Get analytics summary
export async function getAnalyticsSummary(days: number = 7) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const summary = await db
            .select({
                domainName: domains.name,
                activityName: activities.name,
                avgMood: sql<number>`AVG(${logs.moodScore})`,
                avgEnergy: sql<number>`AVG(${logs.energyLevel})`,
                avgProductivity: sql<number>`AVG(${logs.productivityScore})`,
                count: sql<number>`COUNT(*)`,
            })
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .leftJoin(activities, eq(logs.activityId, activities.id))
            .where(sql`${logs.createdAt} >= ${since}`)
            .groupBy(domains.name, activities.name);

        return summary;
    } catch (error) {
        console.error("Analytics summary failed:", error);
        return [];
    }
}

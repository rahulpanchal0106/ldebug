'use server'

import { db } from '../db';
import { logs, domains, activities } from '../db/schema';
import { sql, desc, eq, gte, lte, and } from 'drizzle-orm';

export type LogEntry = {
    id: number;
    content: string;
    description: string;
    userInput: string;
    domainName: string | null;
    activityName: string | null;
    moodScore: number;
    energyLevel: number;
    productivityScore: number;
    stressLevel: number | null;
    satisfactionScore: number | null;
    metadata: Record<string, unknown> | null;
    location: string | null;
    timeOfDay: string | null;
    durationMinutes: number | null;
    amount: string | null;
    currency: string | null;
    sentiment: string | null;
    priority: string | null;
    createdAt: Date;
};

// Get logs by date range
export async function getLogsByDateRange(startDate: Date, endDate: Date) {
    try {
        const results = await db
            .select({
                id: logs.id,
                content: logs.content,
                description: logs.description,
                userInput: logs.userInput,
                domainName: domains.name,
                activityName: activities.name,
                moodScore: logs.moodScore,
                energyLevel: logs.energyLevel,
                productivityScore: logs.productivityScore,
                stressLevel: logs.stressLevel,
                satisfactionScore: logs.satisfactionScore,
                metadata: logs.metadata,
                location: logs.location,
                timeOfDay: logs.timeOfDay,
                durationMinutes: logs.durationMinutes,
                amount: logs.amount,
                currency: logs.currency,
                sentiment: logs.sentiment,
                priority: logs.priority,
                createdAt: logs.createdAt,
            })
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .leftJoin(activities, eq(logs.activityId, activities.id))
            .where(
                and(
                    gte(logs.createdAt, startDate),
                    lte(logs.createdAt, endDate)
                )
            )
            .orderBy(desc(logs.createdAt));

        return results as LogEntry[];
    } catch (error) {
        console.error("Get logs by date range failed:", error);
        return [];
    }
}

// Get logs by specific date
export async function getLogsByDate(date: Date) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await getLogsByDateRange(startOfDay, endOfDay);
    } catch (error) {
        console.error("Get logs by date failed:", error);
        return [];
    }
}

// Get logs with pagination
export async function getLogsWithPagination(page: number = 1, limit: number = 20) {
    try {
        const offset = (page - 1) * limit;

        const results = await db
            .select({
                id: logs.id,
                content: logs.content,
                description: logs.description,
                userInput: logs.userInput,
                domainName: domains.name,
                activityName: activities.name,
                moodScore: logs.moodScore,
                energyLevel: logs.energyLevel,
                productivityScore: logs.productivityScore,
                stressLevel: logs.stressLevel,
                satisfactionScore: logs.satisfactionScore,
                metadata: logs.metadata,
                location: logs.location,
                timeOfDay: logs.timeOfDay,
                durationMinutes: logs.durationMinutes,
                amount: logs.amount,
                currency: logs.currency,
                sentiment: logs.sentiment,
                priority: logs.priority,
                createdAt: logs.createdAt,
            })
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .leftJoin(activities, eq(logs.activityId, activities.id))
            .orderBy(desc(logs.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const totalCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(logs);

        return {
            logs: results as LogEntry[],
            total: totalCount[0]?.count || 0,
            page,
            limit,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
        };
    } catch (error) {
        console.error("Get logs with pagination failed:", error);
        return {
            logs: [],
            total: 0,
            page: 1,
            limit,
            totalPages: 0,
        };
    }
}

// Get all logs (for notebook - one page per log)
export async function getAllLogs() {
    try {
        const results = await db
            .select({
                id: logs.id,
                content: logs.content,
                description: logs.description,
                userInput: logs.userInput,
                domainName: domains.name,
                activityName: activities.name,
                moodScore: logs.moodScore,
                energyLevel: logs.energyLevel,
                productivityScore: logs.productivityScore,
                stressLevel: logs.stressLevel,
                satisfactionScore: logs.satisfactionScore,
                metadata: logs.metadata,
                location: logs.location,
                timeOfDay: logs.timeOfDay,
                durationMinutes: logs.durationMinutes,
                amount: logs.amount,
                currency: logs.currency,
                sentiment: logs.sentiment,
                priority: logs.priority,
                createdAt: logs.createdAt,
            })
            .from(logs)
            .leftJoin(domains, eq(logs.domainId, domains.id))
            .leftJoin(activities, eq(logs.activityId, activities.id))
            .orderBy(desc(logs.createdAt));

        return results as LogEntry[];
    } catch (error) {
        console.error("Get all logs failed:", error);
        return [];
    }
}

// Get logs from the last N days
export async function getRecentLogs(days: number) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return await getLogsByDateRange(startDate, endDate);
    } catch (error) {
        console.error("Get recent logs failed:", error);
        return [];
    }
}

// Get calendar data for a specific month/year
export async function getCalendarData(year: number, month: number) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const results = await db
            .select({
                date: sql<string>`DATE(${logs.createdAt})`,
                count: sql<number>`COUNT(*)`,
            })
            .from(logs)
            .where(
                and(
                    gte(logs.createdAt, startDate),
                    lte(logs.createdAt, endDate)
                )
            )
            .groupBy(sql`DATE(${logs.createdAt})`);

        // Convert to a map for easy lookup
        const dateMap: Record<string, number> = {};
        results.forEach((r) => {
            const dateStr = r.date.toString().split('T')[0]; // Get YYYY-MM-DD
            dateMap[dateStr] = r.count;
        });

        return dateMap;
    } catch (error) {
        console.error("Get calendar data failed:", error);
        return {};
    }
}


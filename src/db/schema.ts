// src/db/schema.ts - Life Operating System Schema
import { pgTable, serial, text, integer, timestamp, boolean, jsonb, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// 1. HIERARCHICAL TAXONOMY
// ============================================

// Domains: Major life areas (Work, Health, Finance, Social, Growth, etc.)
export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(), // "Work", "Health", "Finance", "Social", "Growth", "Leisure"
  color: text('color'), // Hex color for UI
  icon: text('icon'), // Icon identifier
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('domains_name_idx').on(table.name),
}));

// Activities: Subcategories within domains (Coding, Sleep, SIP, etc.)
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  domainId: integer('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  description: text('description'),
  color: text('color'), // Can override domain color
  metadataSchema: jsonb('metadata_schema'), // JSON Schema for validating activity-specific metadata
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  domainIdx: index('activities_domain_idx').on(table.domainId),
  nameDomainIdx: index('activities_name_domain_idx').on(table.name, table.domainId),
}));

// ============================================
// 2. TAGS SYSTEM (Cross-domain categorization)
// ============================================

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  color: text('color'),
  category: text('category'), // "emotion", "location", "person", "tool", "custom"
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('tags_name_idx').on(table.name),
}));

// ============================================
// 3. THE MASTER LOG TABLE (Polymorphic Storage)
// ============================================

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),

  // Core Content
  content: text('content').notNull(), // The raw user input
  description: text('description').notNull(), // AI-generated summary
  userInput: text('user_input').notNull(), // Original user text (preserved)

  // 🔗 Hierarchical Classification
  domainId: integer('domain_id').references(() => domains.id),
  activityId: integer('activity_id').references(() => activities.id),

  // 📊 Universal Metrics (Applies to EVERYTHING)
  moodScore: integer('mood_score').notNull().default(5), // 1-10, required
  energyLevel: integer('energy_level').notNull().default(5), // 1-10, required
  productivityScore: integer('productivity_score').notNull().default(5), // 1-10, required
  stressLevel: integer('stress_level'), // 1-10, optional
  satisfactionScore: integer('satisfaction_score'), // 1-10, optional

  // 🧠 DYNAMIC METADATA (JSONB - Activity-specific data)
  // Examples:
  // Work/Coding: { "language": "TypeScript", "lines_of_code": 500, "bugs_fixed": 2, "ticket_id": "PROJ-123" }
  // Health/Workout: { "exercise": "Bench Press", "weight_kg": 60, "reps": 10, "sets": 3 }
  // Finance/Investing: { "amount": 5000, "type": "SIP", "ticker": "NIFTY50", "roi_expected": 12 }
  // Social/Friends: { "person_name": "John", "location": "Coffee Shop", "duration_minutes": 120 }
  metadata: jsonb('metadata'),

  // 🎯 Context & Relationships
  relatedLogIds: integer('related_log_ids').array(), // Array of log IDs this relates to
  goalId: integer('goal_id').references(() => goals.id), // Link to a goal if applicable
  projectId: integer('project_id'), // Optional project reference

  // 📍 Spatiotemporal Context
  location: text('location'), // "Home", "Office", "Gym", or coordinates
  weather: text('weather'), // "sunny", "rainy", etc.
  timeOfDay: text('time_of_day'), // "morning", "afternoon", "evening", "night"

  // ⏱️ Time Tracking
  durationMinutes: integer('duration_minutes'), // How long the activity took
  startTime: timestamp('start_time'), // When activity started
  endTime: timestamp('end_time'), // When activity ended

  // 💰 Financial Data (if applicable)
  amount: decimal('amount', { precision: 12, scale: 2 }), // Money amount
  currency: text('currency'), // Currency code (INR by default in application logic)

  // 🏷️ Categorization
  priority: text('priority'), // "low", "medium", "high", "critical"
  sentiment: text('sentiment'), // "positive", "negative", "neutral"
  
  // AI Analysis
  aiAction: text('ai_action'), // "acknowledge", "question", "insight", "reminder"
  aiContext: jsonb('ai_context'), // Additional AI analysis

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  domainIdx: index('logs_domain_idx').on(table.domainId),
  activityIdx: index('logs_activity_idx').on(table.activityId),
  createdAtIdx: index('logs_created_at_idx').on(table.createdAt),
  userIdIdx: index('logs_user_id_idx').on(table.userId),
  goalIdx: index('logs_goal_idx').on(table.goalId),
  moodScoreIdx: index('logs_mood_score_idx').on(table.moodScore),
  compositeIdx: index('logs_domain_activity_created_idx').on(table.domainId, table.activityId, table.createdAt),
}));

// ============================================
// 4. JUNCTION TABLES
// ============================================

// Logs <-> Tags (Many-to-Many)
export const logsToTags = pgTable('logs_to_tags', {
  logId: integer('log_id').references(() => logs.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  logTagIdx: index('logs_to_tags_log_tag_idx').on(table.logId, table.tagId),
}));

// ============================================
// 5. GOALS & HABITS TRACKING
// ============================================

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  title: text('title').notNull(),
  description: text('description'),
  domainId: integer('domain_id').references(() => domains.id),
  activityId: integer('activity_id').references(() => activities.id),
  
  // Goal Metrics
  targetValue: decimal('target_value', { precision: 12, scale: 2 }),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }).default('0'),
  unit: text('unit'), // "hours", "dollars", "reps", "days"
  
  // Timeline
  startDate: timestamp('start_date'),
  targetDate: timestamp('target_date'),
  completedAt: timestamp('completed_at'),
  
  // Status
  status: text('status').default('active'), // "active", "paused", "completed", "cancelled"
  priority: text('priority').default('medium'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('goals_user_id_idx').on(table.userId),
  domainIdx: index('goals_domain_idx').on(table.domainId),
  statusIdx: index('goals_status_idx').on(table.status),
}));

// ============================================
// 6. HABITS (Recurring activities)
// ============================================

export const habits = pgTable('habits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  name: text('name').notNull(),
  description: text('description'),
  domainId: integer('domain_id').references(() => domains.id),
  activityId: integer('activity_id').references(() => activities.id),
  
  // Frequency
  frequency: text('frequency').notNull(), // "daily", "weekly", "custom"
  frequencyData: jsonb('frequency_data'), // Custom frequency rules
  
  // Tracking
  streakCurrent: integer('streak_current').default(0),
  streakLongest: integer('streak_longest').default(0),
  totalCompletions: integer('total_completions').default(0),
  
  // Status
  isActive: boolean('is_active').default(true),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('habits_user_id_idx').on(table.userId),
  domainIdx: index('habits_domain_idx').on(table.domainId),
}));

// Habit Completions (links habits to logs)
export const habitCompletions = pgTable('habit_completions', {
  id: serial('id').primaryKey(),
  habitId: integer('habit_id').references(() => habits.id, { onDelete: 'cascade' }),
  logId: integer('log_id').references(() => logs.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at').defaultNow(),
}, (table) => ({
  habitIdx: index('habit_completions_habit_idx').on(table.habitId),
  logIdx: index('habit_completions_log_idx').on(table.logId),
}));

// ============================================
// 7. ANALYTICS & INSIGHTS (Pre-computed aggregations)
// ============================================

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  
  // Aggregation Type
  type: text('type').notNull(), // "daily_summary", "weekly_trend", "correlation", "pattern"
  
  // Time Period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Aggregated Data
  data: jsonb('data').notNull(), // The computed analytics
  
  // Metadata
  computedAt: timestamp('computed_at').defaultNow(),
  version: integer('version').default(1),
}, (table) => ({
  userIdTypeIdx: index('analytics_user_type_idx').on(table.userId, table.type),
  periodIdx: index('analytics_period_idx').on(table.periodStart, table.periodEnd),
}));

// ============================================
// 8. DRIZZLE RELATIONS
// ============================================

export const domainsRelations = relations(domains, ({ many }) => ({
  activities: many(activities),
  logs: many(logs),
  goals: many(goals),
  habits: many(habits),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  domain: one(domains, {
    fields: [activities.domainId],
    references: [domains.id],
  }),
  logs: many(logs),
  goals: many(goals),
  habits: many(habits),
}));

export const logsRelations = relations(logs, ({ one, many }) => ({
  domain: one(domains, {
    fields: [logs.domainId],
    references: [domains.id],
  }),
  activity: one(activities, {
    fields: [logs.activityId],
    references: [activities.id],
  }),
  goal: one(goals, {
    fields: [logs.goalId],
    references: [goals.id],
  }),
  tags: many(logsToTags),
  habitCompletions: many(habitCompletions),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  logs: many(logsToTags),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  domain: one(domains, {
    fields: [goals.domainId],
    references: [domains.id],
  }),
  activity: one(activities, {
    fields: [goals.activityId],
    references: [activities.id],
  }),
  logs: many(logs),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  domain: one(domains, {
    fields: [habits.domainId],
    references: [domains.id],
  }),
  activity: one(activities, {
    fields: [habits.activityId],
    references: [activities.id],
  }),
  completions: many(habitCompletions),
}));

export const habitCompletionsRelations = relations(habitCompletions, ({ one }) => ({
  habit: one(habits, {
    fields: [habitCompletions.habitId],
    references: [habits.id],
  }),
  log: one(logs, {
    fields: [habitCompletions.logId],
    references: [logs.id],
  }),
}));

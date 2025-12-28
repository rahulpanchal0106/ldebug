import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// In production (Render), use the connection string. 
// Locally, use your Docker string.
const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client);
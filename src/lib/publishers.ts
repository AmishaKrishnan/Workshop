/**
 * Publisher data-access helpers for the SQLite-backed game catalog.
 *
 * Keeps the app-facing `Publisher` shape separate from raw Drizzle rows and
 * exposes a stable, injectable `db` interface for tests and pages.
 */
import { asc } from 'drizzle-orm';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';
import type { Database } from './db';

/**
 * Retrieves all publishers ordered alphabetically by name.
 *
 * @param db - The injectable Drizzle database instance to query.
 * @returns A promise resolving to publisher summaries containing each
 * publisher's id and name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}

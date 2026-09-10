import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterFixtures(db: Database): Promise<void> {
    const insertedCategories = await db
        .insert(categories)
        .values([
            { name: 'Strategy', description: 'strategy games' },
            { name: 'Puzzle', description: 'puzzle games' },
        ])
        .returning({ id: categories.id, name: categories.name });
    const insertedPublishers = await db
        .insert(publishers)
        .values([
            { name: 'Alpha Games', description: 'alpha' },
            { name: 'Beta Games', description: 'beta' },
        ])
        .returning({ id: publishers.id, name: publishers.name });
    const strategy = insertedCategories.find((category) => category.name === 'Strategy');
    const puzzle = insertedCategories.find((category) => category.name === 'Puzzle');
    const alpha = insertedPublishers.find((publisher) => publisher.name === 'Alpha Games');
    const beta = insertedPublishers.find((publisher) => publisher.name === 'Beta Games');

    if (!strategy || !puzzle || !alpha || !beta) {
        throw new Error('Failed to create filtering fixtures');
    }

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'Alpha strategy',
            starRating: 4,
            categoryId: strategy.id,
            publisherId: alpha.id,
        },
        {
            title: 'Beta Strategy',
            description: 'Beta strategy',
            starRating: 4,
            categoryId: strategy.id,
            publisherId: beta.id,
        },
        {
            title: 'Alpha Puzzle',
            description: 'Alpha puzzle',
            starRating: 4,
            categoryId: puzzle.id,
            publisherId: alpha.id,
        },
    ]);
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by one category', async () => {
        await seedFilterFixtures(db);
        const strategy = await getGames(db, { categoryIds: [1] });

        expect(strategy.map((game) => game.title)).toEqual(['Alpha Strategy', 'Beta Strategy']);
    });

    it('filters games by multiple categories and one publisher', async () => {
        await seedFilterFixtures(db);
        const filtered = await getGames(db, { categoryIds: [1, 2], publisherId: 1 });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha Puzzle', 'Alpha Strategy']);
    });

    it('returns no games when filters do not match', async () => {
        await seedFilterFixtures(db);

        expect(await getGames(db, { categoryIds: [99999] })).toEqual([]);
    });

    it('treats an empty category selection as no category filter', async () => {
        await seedFilterFixtures(db);

        expect(await getGames(db, { categoryIds: [] })).toHaveLength(3);
    });
});

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cookingSessionsTable, recipesTable } from '../db/schema';
import { completeCookingSession } from '../handlers/complete_cooking_session';
import { eq } from 'drizzle-orm';

describe('completeCookingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let recipeId: number;
  let sessionId: number;

  // Create prerequisite data before each test
  beforeEach(async () => {
    // Create a test recipe
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: 'Test instructions',
        difficulty: 'easy'
      })
      .returning()
      .execute();

    recipeId = recipeResult[0].id;

    // Create a test cooking session
    const sessionResult = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: recipeId,
        current_step: 2
      })
      .returning()
      .execute();

    sessionId = sessionResult[0].id;
  });

  it('should complete a cooking session without rating', async () => {
    const result = await completeCookingSession(sessionId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(sessionId);
    expect(result!.recipe_id).toBe(recipeId);
    expect(result!.completed_at).toBeInstanceOf(Date);
    expect(result!.completed_at!.getTime()).toBeGreaterThan(Date.now() - 1000); // Within last second
    expect(result!.rating).toBeNull();
    expect(result!.current_step).toBe(2); // Should remain unchanged
  });

  it('should complete a cooking session with valid rating', async () => {
    const rating = 4;
    const result = await completeCookingSession(sessionId, rating);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(sessionId);
    expect(result!.recipe_id).toBe(recipeId);
    expect(result!.completed_at).toBeInstanceOf(Date);
    expect(result!.rating).toBe(4);
    expect(result!.current_step).toBe(2); // Should remain unchanged
  });

  it('should save completion data to database', async () => {
    const rating = 5;
    await completeCookingSession(sessionId, rating);

    // Verify the session was updated in the database
    const sessions = await db.select()
      .from(cookingSessionsTable)
      .where(eq(cookingSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.completed_at).toBeInstanceOf(Date);
    expect(session.rating).toBe(5);
    expect(session.current_step).toBe(2); // Should remain unchanged
  });

  it('should handle minimum rating boundary (1)', async () => {
    const result = await completeCookingSession(sessionId, 1);

    expect(result).not.toBeNull();
    expect(result!.rating).toBe(1);
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should handle maximum rating boundary (5)', async () => {
    const result = await completeCookingSession(sessionId, 5);

    expect(result).not.toBeNull();
    expect(result!.rating).toBe(5);
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should ignore invalid rating below minimum', async () => {
    const result = await completeCookingSession(sessionId, 0);

    expect(result).not.toBeNull();
    expect(result!.rating).toBeNull(); // Invalid rating should be ignored
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should ignore invalid rating above maximum', async () => {
    const result = await completeCookingSession(sessionId, 6);

    expect(result).not.toBeNull();
    expect(result!.rating).toBeNull(); // Invalid rating should be ignored
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent session', async () => {
    const nonExistentId = 99999;
    const result = await completeCookingSession(nonExistentId);

    expect(result).toBeNull();
  });

  it('should handle already completed session', async () => {
    // Complete the session first
    await completeCookingSession(sessionId, 3);

    // Try to complete it again with different rating
    const result = await completeCookingSession(sessionId, 5);

    expect(result).not.toBeNull();
    expect(result!.rating).toBe(5); // Should update to new rating
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should preserve other session data when completing', async () => {
    // Update the session with some notes first
    await db.update(cookingSessionsTable)
      .set({ notes: 'Test notes' })
      .where(eq(cookingSessionsTable.id, sessionId))
      .execute();

    const result = await completeCookingSession(sessionId, 4);

    expect(result).not.toBeNull();
    expect(result!.notes).toBe('Test notes');
    expect(result!.rating).toBe(4);
    expect(result!.completed_at).toBeInstanceOf(Date);
    expect(result!.current_step).toBe(2);
  });
});
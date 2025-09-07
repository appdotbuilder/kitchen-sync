import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cookingSessionsTable, recipesTable, ingredientsTable, recipeIngredientsTable } from '../db/schema';
import { type UpdateCookingSessionInput } from '../schema';
import { updateCookingSession } from '../handlers/update_cooking_session';
import { eq } from 'drizzle-orm';

describe('updateCookingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testRecipeId: number;
  let testSessionId: number;

  beforeEach(async () => {
    // Create prerequisite data: ingredient -> recipe -> cooking session
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'Vegetable',
        unit: 'cup'
      })
      .returning()
      .execute();

    const recipe = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: '["Step 1", "Step 2", "Step 3"]',
        prep_time: 10,
        cook_time: 20,
        servings: 4
      })
      .returning()
      .execute();

    testRecipeId = recipe[0].id;

    // Add ingredient to recipe
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: testRecipeId,
        ingredient_id: ingredient[0].id,
        quantity: 2,
        unit: 'cup',
        notes: null
      })
      .execute();

    // Create cooking session
    const session = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: testRecipeId,
        current_step: 0,
        notes: null,
        rating: null
      })
      .returning()
      .execute();

    testSessionId = session[0].id;
  });

  it('should update current step', async () => {
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      current_step: 2
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.current_step).toEqual(2);
    expect(result!.completed_at).toBeNull(); // Should remain null
    expect(result!.rating).toBeNull();
  });

  it('should update notes', async () => {
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      notes: 'Added extra seasoning'
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.notes).toEqual('Added extra seasoning');
    expect(result!.current_step).toEqual(0); // Should remain unchanged
    expect(result!.completed_at).toBeNull();
  });

  it('should update rating and mark as completed', async () => {
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      rating: 5
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.rating).toEqual(5);
    expect(result!.completed_at).not.toBeNull();
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      current_step: 3,
      notes: 'Recipe was delicious!',
      rating: 4
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.current_step).toEqual(3);
    expect(result!.notes).toEqual('Recipe was delicious!');
    expect(result!.rating).toEqual(4);
    expect(result!.completed_at).not.toBeNull();
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should handle partial updates correctly', async () => {
    // First update: set initial values
    await updateCookingSession({
      id: testSessionId,
      current_step: 1,
      notes: 'Initial notes'
    });

    // Second update: only update step, notes should remain
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      current_step: 2
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.current_step).toEqual(2);
    expect(result!.notes).toEqual('Initial notes'); // Should be preserved
  });

  it('should save changes to database', async () => {
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      current_step: 2,
      notes: 'Database test'
    };

    await updateCookingSession(input);

    // Verify changes were persisted
    const sessions = await db.select()
      .from(cookingSessionsTable)
      .where(eq(cookingSessionsTable.id, testSessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].current_step).toEqual(2);
    expect(sessions[0].notes).toEqual('Database test');
  });

  it('should return null for non-existent session', async () => {
    const input: UpdateCookingSessionInput = {
      id: 99999, // Non-existent ID
      current_step: 1
    };

    const result = await updateCookingSession(input);

    expect(result).toBeNull();
  });

  it('should handle null values correctly', async () => {
    // First set some values
    await updateCookingSession({
      id: testSessionId,
      notes: 'Some notes'
    });

    // Then update with null
    const input: UpdateCookingSessionInput = {
      id: testSessionId,
      notes: null
    };

    const result = await updateCookingSession(input);

    expect(result).not.toBeNull();
    expect(result!.notes).toBeNull();
  });

  it('should handle edge case rating values', async () => {
    // Test minimum rating
    let input: UpdateCookingSessionInput = {
      id: testSessionId,
      rating: 1
    };

    let result = await updateCookingSession(input);
    expect(result!.rating).toEqual(1);
    expect(result!.completed_at).not.toBeNull();

    // Create new session for maximum rating test
    const newSession = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: testRecipeId,
        current_step: 0
      })
      .returning()
      .execute();

    // Test maximum rating
    input = {
      id: newSession[0].id,
      rating: 5
    };

    result = await updateCookingSession(input);
    expect(result!.rating).toEqual(5);
    expect(result!.completed_at).not.toBeNull();
  });
});
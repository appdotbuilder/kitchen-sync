import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recipesTable, cookingSessionsTable, ingredientsTable, recipeIngredientsTable } from '../db/schema';
import { getCookingSession } from '../handlers/get_cooking_session';

describe('getCookingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent cooking session', async () => {
    const result = await getCookingSession(999);
    expect(result).toBeNull();
  });

  it('should fetch an existing cooking session by ID', async () => {
    // Create prerequisite data - ingredient first
    const ingredientResult = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'Test Category',
        unit: 'cup'
      })
      .returning()
      .execute();

    // Create recipe
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        description: 'A test recipe',
        instructions: JSON.stringify(['Step 1', 'Step 2'])
      })
      .returning()
      .execute();

    const recipeId = recipeResult[0].id;

    // Add recipe ingredient
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipeId,
        ingredient_id: ingredientResult[0].id,
        quantity: 2,
        unit: 'cups',
        notes: 'Fresh'
      })
      .execute();

    // Create cooking session
    const sessionResult = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: recipeId,
        current_step: 1,
        notes: 'Cooking in progress',
        rating: null
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Test the handler
    const result = await getCookingSession(sessionId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(sessionId);
    expect(result?.recipe_id).toEqual(recipeId);
    expect(result?.current_step).toEqual(1);
    expect(result?.notes).toEqual('Cooking in progress');
    expect(result?.rating).toBeNull();
    expect(result?.completed_at).toBeNull();
    expect(result?.started_at).toBeInstanceOf(Date);
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should fetch completed cooking session with rating', async () => {
    // Create prerequisite data - ingredient first
    const ingredientResult = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient 2',
        category: 'Test Category',
        unit: 'gram'
      })
      .returning()
      .execute();

    // Create recipe
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Completed Recipe',
        description: 'A completed test recipe',
        instructions: JSON.stringify(['Step 1', 'Step 2', 'Step 3'])
      })
      .returning()
      .execute();

    const recipeId = recipeResult[0].id;

    // Add recipe ingredient
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipeId,
        ingredient_id: ingredientResult[0].id,
        quantity: 500,
        unit: 'grams',
        notes: null
      })
      .execute();

    const completedAt = new Date();
    
    // Create completed cooking session
    const sessionResult = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: recipeId,
        current_step: 3,
        notes: 'Recipe completed successfully',
        rating: 5,
        completed_at: completedAt
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Test the handler
    const result = await getCookingSession(sessionId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(sessionId);
    expect(result?.recipe_id).toEqual(recipeId);
    expect(result?.current_step).toEqual(3);
    expect(result?.notes).toEqual('Recipe completed successfully');
    expect(result?.rating).toEqual(5);
    expect(result?.completed_at).toBeInstanceOf(Date);
    expect(result?.started_at).toBeInstanceOf(Date);
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should fetch cooking session with minimal data', async () => {
    // Create prerequisite data - ingredient first
    const ingredientResult = await db.insert(ingredientsTable)
      .values({
        name: 'Minimal Ingredient',
        category: null,
        unit: 'piece'
      })
      .returning()
      .execute();

    // Create minimal recipe
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Minimal Recipe',
        instructions: JSON.stringify(['Single step'])
      })
      .returning()
      .execute();

    const recipeId = recipeResult[0].id;

    // Add recipe ingredient
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipeId,
        ingredient_id: ingredientResult[0].id,
        quantity: 1,
        unit: 'piece'
      })
      .execute();

    // Create cooking session with minimal data
    const sessionResult = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: recipeId
        // Using defaults: current_step = 0, notes = null, rating = null, completed_at = null
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Test the handler
    const result = await getCookingSession(sessionId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(sessionId);
    expect(result?.recipe_id).toEqual(recipeId);
    expect(result?.current_step).toEqual(0); // Default value
    expect(result?.notes).toBeNull();
    expect(result?.rating).toBeNull();
    expect(result?.completed_at).toBeNull();
    expect(result?.started_at).toBeInstanceOf(Date);
    expect(result?.created_at).toBeInstanceOf(Date);
  });
});
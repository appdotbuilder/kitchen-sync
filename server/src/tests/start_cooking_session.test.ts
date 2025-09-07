import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cookingSessionsTable, recipesTable, ingredientsTable, recipeIngredientsTable } from '../db/schema';
import { type StartCookingSessionInput } from '../schema';
import { startCookingSession } from '../handlers/start_cooking_session';
import { eq } from 'drizzle-orm';

// Test input
const testInput: StartCookingSessionInput = {
  recipe_id: 1
};

describe('startCookingSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start a cooking session', async () => {
    // Create prerequisite data - ingredient first
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'vegetables',
        unit: 'cup'
      })
      .returning()
      .execute();

    // Create a recipe
    const recipe = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: JSON.stringify(['Step 1: Mix ingredients', 'Step 2: Cook']),
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'easy'
      })
      .returning()
      .execute();

    // Add recipe ingredient
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipe[0].id,
        ingredient_id: ingredient[0].id,
        quantity: 1,
        unit: 'cup'
      })
      .execute();

    const sessionInput = { recipe_id: recipe[0].id };
    const result = await startCookingSession(sessionInput);

    // Basic field validation
    expect(result.recipe_id).toEqual(recipe[0].id);
    expect(result.current_step).toEqual(0);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.rating).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
  });

  it('should save cooking session to database', async () => {
    // Create prerequisite data
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'vegetables',
        unit: 'cup'
      })
      .returning()
      .execute();

    const recipe = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: JSON.stringify(['Step 1: Mix ingredients']),
        prep_time: 10
      })
      .returning()
      .execute();

    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipe[0].id,
        ingredient_id: ingredient[0].id,
        quantity: 2,
        unit: 'cups'
      })
      .execute();

    const sessionInput = { recipe_id: recipe[0].id };
    const result = await startCookingSession(sessionInput);

    // Verify session was saved to database
    const sessions = await db.select()
      .from(cookingSessionsTable)
      .where(eq(cookingSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].recipe_id).toEqual(recipe[0].id);
    expect(sessions[0].current_step).toEqual(0);
    expect(sessions[0].started_at).toBeInstanceOf(Date);
    expect(sessions[0].completed_at).toBeNull();
  });

  it('should throw error for non-existent recipe', async () => {
    const nonExistentRecipeInput = { recipe_id: 999 };
    
    await expect(startCookingSession(nonExistentRecipeInput))
      .rejects.toThrow(/recipe with id 999 not found/i);
  });

  it('should create multiple cooking sessions for same recipe', async () => {
    // Create prerequisite data
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Flour',
        category: 'baking',
        unit: 'cup'
      })
      .returning()
      .execute();

    const recipe = await db.insert(recipesTable)
      .values({
        title: 'Bread Recipe',
        instructions: JSON.stringify(['Knead dough', 'Let rise', 'Bake']),
        cook_time: 45
      })
      .returning()
      .execute();

    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipe[0].id,
        ingredient_id: ingredient[0].id,
        quantity: 3,
        unit: 'cups'
      })
      .execute();

    const sessionInput = { recipe_id: recipe[0].id };
    
    // Start first cooking session
    const session1 = await startCookingSession(sessionInput);
    
    // Start second cooking session for same recipe
    const session2 = await startCookingSession(sessionInput);

    // Both sessions should exist and be different
    expect(session1.id).not.toEqual(session2.id);
    expect(session1.recipe_id).toEqual(session2.recipe_id);
    expect(session1.current_step).toEqual(0);
    expect(session2.current_step).toEqual(0);

    // Verify both sessions are in database
    const sessions = await db.select()
      .from(cookingSessionsTable)
      .where(eq(cookingSessionsTable.recipe_id, recipe[0].id))
      .execute();

    expect(sessions).toHaveLength(2);
  });

  it('should initialize session with correct default values', async () => {
    // Create prerequisite data with minimal recipe
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Salt',
        unit: 'tsp'
      })
      .returning()
      .execute();

    const recipe = await db.insert(recipesTable)
      .values({
        title: 'Simple Recipe',
        instructions: JSON.stringify(['Add salt'])
      })
      .returning()
      .execute();

    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipe[0].id,
        ingredient_id: ingredient[0].id,
        quantity: 0.5,
        unit: 'tsp'
      })
      .execute();

    const sessionInput = { recipe_id: recipe[0].id };
    const result = await startCookingSession(sessionInput);

    // Verify all default values
    expect(result.current_step).toEqual(0);
    expect(result.completed_at).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.rating).toBeNull();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last few seconds)
    const now = new Date();
    const timeDiff = now.getTime() - result.started_at.getTime();
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });
});
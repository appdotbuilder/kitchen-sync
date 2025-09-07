import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { mealPlanEntriesTable, mealPlansTable, recipesTable } from '../db/schema';
import { type CreateMealPlanEntryInput } from '../schema';
import { createMealPlanEntry } from '../handlers/create_meal_plan_entry';
import { eq } from 'drizzle-orm';

describe('createMealPlanEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a meal plan entry', async () => {
    // Create a meal plan first
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Test Meal Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: 'A test meal plan'
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResult[0];

    // Create a recipe first
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: 'Test instructions',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        difficulty: 'easy'
      })
      .returning()
      .execute();

    const recipe = recipeResult[0];

    const testInput: CreateMealPlanEntryInput = {
      meal_plan_id: mealPlan.id,
      recipe_id: recipe.id,
      date: new Date('2024-01-02'),
      meal_type: 'lunch',
      servings: 2,
      notes: 'Packed lunch for work'
    };

    const result = await createMealPlanEntry(testInput);

    // Basic field validation
    expect(result.meal_plan_id).toEqual(mealPlan.id);
    expect(result.recipe_id).toEqual(recipe.id);
    expect(result.date).toEqual(new Date('2024-01-02'));
    expect(result.meal_type).toEqual('lunch');
    expect(result.servings).toEqual(2);
    expect(result.notes).toEqual('Packed lunch for work');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
  });

  it('should save meal plan entry to database', async () => {
    // Create prerequisites
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Weekend Plan',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-02'),
        description: 'Weekend meals'
      })
      .returning()
      .execute();

    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Pancakes',
        instructions: 'Mix and cook',
        servings: 4
      })
      .returning()
      .execute();

    const testInput: CreateMealPlanEntryInput = {
      meal_plan_id: mealPlanResult[0].id,
      recipe_id: recipeResult[0].id,
      date: new Date('2024-02-01'),
      meal_type: 'breakfast',
      servings: 3,
      notes: null
    };

    const result = await createMealPlanEntry(testInput);

    // Verify in database
    const entries = await db.select()
      .from(mealPlanEntriesTable)
      .where(eq(mealPlanEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    const savedEntry = entries[0];
    expect(savedEntry.meal_plan_id).toEqual(mealPlanResult[0].id);
    expect(savedEntry.recipe_id).toEqual(recipeResult[0].id);
    expect(savedEntry.date).toEqual(new Date('2024-02-01'));
    expect(savedEntry.meal_type).toEqual('breakfast');
    expect(savedEntry.servings).toEqual(3);
    expect(savedEntry.notes).toBeNull();
  });

  it('should handle all meal types correctly', async () => {
    // Create prerequisites
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Full Day Plan',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-03-01')
      })
      .returning()
      .execute();

    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Universal Dish',
        instructions: 'Cook it'
      })
      .returning()
      .execute();

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

    for (const mealType of mealTypes) {
      const testInput: CreateMealPlanEntryInput = {
        meal_plan_id: mealPlanResult[0].id,
        recipe_id: recipeResult[0].id,
        date: new Date('2024-03-01'),
        meal_type: mealType,
        servings: 1,
        notes: `${mealType} meal`
      };

      const result = await createMealPlanEntry(testInput);
      expect(result.meal_type).toEqual(mealType);
      expect(result.notes).toEqual(`${mealType} meal`);
    }
  });

  it('should throw error when meal plan does not exist', async () => {
    // Create only a recipe
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: 'Test Recipe',
        instructions: 'Test instructions'
      })
      .returning()
      .execute();

    const testInput: CreateMealPlanEntryInput = {
      meal_plan_id: 99999, // Non-existent ID
      recipe_id: recipeResult[0].id,
      date: new Date('2024-01-01'),
      meal_type: 'dinner',
      servings: 4,
      notes: null
    };

    expect(createMealPlanEntry(testInput)).rejects.toThrow(/meal plan.*not found/i);
  });

  it('should throw error when recipe does not exist', async () => {
    // Create only a meal plan
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Test Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    const testInput: CreateMealPlanEntryInput = {
      meal_plan_id: mealPlanResult[0].id,
      recipe_id: 99999, // Non-existent ID
      date: new Date('2024-01-01'),
      meal_type: 'dinner',
      servings: 4,
      notes: null
    };

    expect(createMealPlanEntry(testInput)).rejects.toThrow(/recipe.*not found/i);
  });

  it('should create multiple entries for same meal plan', async () => {
    // Create prerequisites
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Multi-Day Plan',
        start_date: new Date('2024-04-01'),
        end_date: new Date('2024-04-03')
      })
      .returning()
      .execute();

    const recipe1Result = await db.insert(recipesTable)
      .values({
        title: 'Recipe 1',
        instructions: 'Instructions 1'
      })
      .returning()
      .execute();

    const recipe2Result = await db.insert(recipesTable)
      .values({
        title: 'Recipe 2',
        instructions: 'Instructions 2'
      })
      .returning()
      .execute();

    // Create first entry
    const entry1Input: CreateMealPlanEntryInput = {
      meal_plan_id: mealPlanResult[0].id,
      recipe_id: recipe1Result[0].id,
      date: new Date('2024-04-01'),
      meal_type: 'breakfast',
      servings: 2,
      notes: 'Day 1 breakfast'
    };

    // Create second entry
    const entry2Input: CreateMealPlanEntryInput = {
      meal_plan_id: mealPlanResult[0].id,
      recipe_id: recipe2Result[0].id,
      date: new Date('2024-04-01'),
      meal_type: 'dinner',
      servings: 4,
      notes: 'Day 1 dinner'
    };

    const result1 = await createMealPlanEntry(entry1Input);
    const result2 = await createMealPlanEntry(entry2Input);

    // Both should be created successfully
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Verify both exist in database
    const allEntries = await db.select()
      .from(mealPlanEntriesTable)
      .where(eq(mealPlanEntriesTable.meal_plan_id, mealPlanResult[0].id))
      .execute();

    expect(allEntries).toHaveLength(2);
  });
});
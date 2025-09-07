import { db } from '../db';
import { mealPlanEntriesTable, mealPlansTable, recipesTable } from '../db/schema';
import { type CreateMealPlanEntryInput, type MealPlanEntry } from '../schema';
import { eq } from 'drizzle-orm';

export const createMealPlanEntry = async (input: CreateMealPlanEntryInput): Promise<MealPlanEntry> => {
  try {
    // Verify that the meal plan exists
    const mealPlan = await db.select()
      .from(mealPlansTable)
      .where(eq(mealPlansTable.id, input.meal_plan_id))
      .execute();

    if (mealPlan.length === 0) {
      throw new Error(`Meal plan with id ${input.meal_plan_id} not found`);
    }

    // Verify that the recipe exists
    const recipe = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, input.recipe_id))
      .execute();

    if (recipe.length === 0) {
      throw new Error(`Recipe with id ${input.recipe_id} not found`);
    }

    // Insert meal plan entry record
    const result = await db.insert(mealPlanEntriesTable)
      .values({
        meal_plan_id: input.meal_plan_id,
        recipe_id: input.recipe_id,
        date: input.date,
        meal_type: input.meal_type,
        servings: input.servings,
        notes: input.notes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Meal plan entry creation failed:', error);
    throw error;
  }
};
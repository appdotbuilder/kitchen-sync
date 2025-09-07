import { db } from '../db';
import { mealPlansTable } from '../db/schema';
import { type CreateMealPlanInput, type MealPlan } from '../schema';

export const createMealPlan = async (input: CreateMealPlanInput): Promise<MealPlan> => {
  try {
    // Insert meal plan record
    const result = await db.insert(mealPlansTable)
      .values({
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        description: input.description
      })
      .returning()
      .execute();

    const mealPlan = result[0];
    return mealPlan;
  } catch (error) {
    console.error('Meal plan creation failed:', error);
    throw error;
  }
};
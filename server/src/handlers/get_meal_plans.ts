import { db } from '../db';
import { mealPlansTable } from '../db/schema';
import { type MealPlan } from '../schema';

export const getMealPlans = async (): Promise<MealPlan[]> => {
  try {
    const results = await db.select()
      .from(mealPlansTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch meal plans:', error);
    throw error;
  }
};
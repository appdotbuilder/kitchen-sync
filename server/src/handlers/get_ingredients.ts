import { db } from '../db';
import { ingredientsTable } from '../db/schema';
import { type Ingredient } from '../schema';

export const getIngredients = async (): Promise<Ingredient[]> => {
  try {
    const results = await db.select()
      .from(ingredientsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch ingredients:', error);
    throw error;
  }
};
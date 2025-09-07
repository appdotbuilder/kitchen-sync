import { db } from '../db';
import { recipesTable } from '../db/schema';
import { type Recipe } from '../schema';

export const getRecipes = async (): Promise<Recipe[]> => {
  try {
    const results = await db.select()
      .from(recipesTable)
      .execute();

    // Convert the database results to match our schema
    return results.map(recipe => ({
      ...recipe,
      // Ensure all fields are properly typed according to our schema
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      instructions: recipe.instructions,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine,
      tags: recipe.tags,
      image_url: recipe.image_url,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    throw error;
  }
};
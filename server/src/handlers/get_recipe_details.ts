import { db } from '../db';
import { recipesTable, recipeIngredientsTable, ingredientsTable } from '../db/schema';
import { type Recipe, type RecipeIngredient } from '../schema';
import { eq } from 'drizzle-orm';

export interface RecipeWithIngredients extends Recipe {
    ingredients: (RecipeIngredient & { ingredient_name: string })[];
}

export const getRecipeDetails = async (id: number): Promise<RecipeWithIngredients | null> => {
  try {
    // First, fetch the recipe
    const recipeResults = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, id))
      .execute();

    if (recipeResults.length === 0) {
      return null;
    }

    const recipe = recipeResults[0];

    // Then, fetch the recipe ingredients with ingredient details
    const ingredientResults = await db.select()
      .from(recipeIngredientsTable)
      .innerJoin(ingredientsTable, eq(recipeIngredientsTable.ingredient_id, ingredientsTable.id))
      .where(eq(recipeIngredientsTable.recipe_id, id))
      .execute();

    // Transform the joined results to match our expected structure
    const ingredients = ingredientResults.map(result => ({
      id: result.recipe_ingredients.id,
      recipe_id: result.recipe_ingredients.recipe_id,
      ingredient_id: result.recipe_ingredients.ingredient_id,
      quantity: parseFloat(result.recipe_ingredients.quantity.toString()), // Convert numeric to number
      unit: result.recipe_ingredients.unit,
      notes: result.recipe_ingredients.notes,
      ingredient_name: result.ingredients.name
    }));

    return {
      ...recipe,
      ingredients
    };
  } catch (error) {
    console.error('Failed to get recipe details:', error);
    throw error;
  }
};
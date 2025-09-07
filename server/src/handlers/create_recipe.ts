import { db } from '../db';
import { recipesTable, recipeIngredientsTable } from '../db/schema';
import { type CreateRecipeInput, type Recipe } from '../schema';

export const createRecipe = async (input: CreateRecipeInput): Promise<Recipe> => {
  try {
    // Create the recipe record first
    const recipeResult = await db.insert(recipesTable)
      .values({
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        prep_time: input.prep_time,
        cook_time: input.cook_time,
        servings: input.servings,
        difficulty: input.difficulty,
        cuisine: input.cuisine,
        tags: input.tags,
        image_url: input.image_url
      })
      .returning()
      .execute();

    const recipe = recipeResult[0];

    // Create recipe ingredient associations
    if (input.ingredients && input.ingredients.length > 0) {
      await db.insert(recipeIngredientsTable)
        .values(
          input.ingredients.map(ingredient => ({
            recipe_id: recipe.id,
            ingredient_id: ingredient.ingredient_id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes
          }))
        )
        .execute();
    }

    return recipe;
  } catch (error) {
    console.error('Recipe creation failed:', error);
    throw error;
  }
};
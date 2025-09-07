import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recipesTable, ingredientsTable, recipeIngredientsTable } from '../db/schema';
import { getRecipeDetails } from '../handlers/get_recipe_details';

// Test data
const testIngredient1 = {
  name: 'Flour',
  category: 'Baking',
  unit: 'cup'
};

const testIngredient2 = {
  name: 'Sugar',
  category: 'Baking',
  unit: 'cup'
};

const testRecipe = {
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  instructions: JSON.stringify(['Mix ingredients', 'Bake for 12 minutes']),
  prep_time: 15,
  cook_time: 12,
  servings: 24,
  difficulty: 'easy' as const,
  cuisine: 'American',
  tags: JSON.stringify(['dessert', 'cookies']),
  image_url: 'https://example.com/cookies.jpg'
};

describe('getRecipeDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return recipe with ingredients when recipe exists', async () => {
    // Create ingredients
    const ingredient1Result = await db.insert(ingredientsTable)
      .values(testIngredient1)
      .returning()
      .execute();
    const ingredient1 = ingredient1Result[0];

    const ingredient2Result = await db.insert(ingredientsTable)
      .values(testIngredient2)
      .returning()
      .execute();
    const ingredient2 = ingredient2Result[0];

    // Create recipe
    const recipeResult = await db.insert(recipesTable)
      .values(testRecipe)
      .returning()
      .execute();
    const recipe = recipeResult[0];

    // Add recipe ingredients
    await db.insert(recipeIngredientsTable)
      .values([
        {
          recipe_id: recipe.id,
          ingredient_id: ingredient1.id,
          quantity: 2.5,
          unit: 'cups',
          notes: 'all-purpose flour'
        },
        {
          recipe_id: recipe.id,
          ingredient_id: ingredient2.id,
          quantity: 1,
          unit: 'cup',
          notes: 'granulated sugar'
        }
      ])
      .execute();

    const result = await getRecipeDetails(recipe.id);

    // Verify recipe details
    expect(result).not.toBeNull();
    expect(result!.id).toBe(recipe.id);
    expect(result!.title).toBe('Chocolate Chip Cookies');
    expect(result!.description).toBe('Delicious homemade cookies');
    expect(result!.prep_time).toBe(15);
    expect(result!.cook_time).toBe(12);
    expect(result!.servings).toBe(24);
    expect(result!.difficulty).toBe('easy');
    expect(result!.cuisine).toBe('American');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify ingredients
    expect(result!.ingredients).toHaveLength(2);
    
    const flourIngredient = result!.ingredients.find(i => i.ingredient_name === 'Flour');
    expect(flourIngredient).toBeDefined();
    expect(flourIngredient!.quantity).toBe(2.5);
    expect(typeof flourIngredient!.quantity).toBe('number');
    expect(flourIngredient!.unit).toBe('cups');
    expect(flourIngredient!.notes).toBe('all-purpose flour');
    expect(flourIngredient!.ingredient_id).toBe(ingredient1.id);

    const sugarIngredient = result!.ingredients.find(i => i.ingredient_name === 'Sugar');
    expect(sugarIngredient).toBeDefined();
    expect(sugarIngredient!.quantity).toBe(1);
    expect(typeof sugarIngredient!.quantity).toBe('number');
    expect(sugarIngredient!.unit).toBe('cup');
    expect(sugarIngredient!.notes).toBe('granulated sugar');
    expect(sugarIngredient!.ingredient_id).toBe(ingredient2.id);
  });

  it('should return recipe with empty ingredients array when recipe has no ingredients', async () => {
    // Create recipe without ingredients
    const recipeResult = await db.insert(recipesTable)
      .values(testRecipe)
      .returning()
      .execute();
    const recipe = recipeResult[0];

    const result = await getRecipeDetails(recipe.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(recipe.id);
    expect(result!.title).toBe('Chocolate Chip Cookies');
    expect(result!.ingredients).toHaveLength(0);
  });

  it('should return null when recipe does not exist', async () => {
    const result = await getRecipeDetails(999);

    expect(result).toBeNull();
  });

  it('should handle recipe with nullable fields correctly', async () => {
    // Create recipe with minimal required fields
    const minimalRecipe = {
      title: 'Simple Recipe',
      instructions: JSON.stringify(['Cook it'])
      // All other fields are nullable and will be null/undefined
    };

    const recipeResult = await db.insert(recipesTable)
      .values(minimalRecipe)
      .returning()
      .execute();
    const recipe = recipeResult[0];

    const result = await getRecipeDetails(recipe.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(recipe.id);
    expect(result!.title).toBe('Simple Recipe');
    expect(result!.description).toBeNull();
    expect(result!.prep_time).toBeNull();
    expect(result!.cook_time).toBeNull();
    expect(result!.servings).toBeNull();
    expect(result!.difficulty).toBeNull();
    expect(result!.cuisine).toBeNull();
    expect(result!.tags).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.ingredients).toHaveLength(0);
  });

  it('should handle decimal quantities correctly', async () => {
    // Create ingredient
    const ingredientResult = await db.insert(ingredientsTable)
      .values({ name: 'Salt', category: 'Seasoning', unit: 'tsp' })
      .returning()
      .execute();
    const ingredient = ingredientResult[0];

    // Create recipe
    const recipeResult = await db.insert(recipesTable)
      .values({ title: 'Test Recipe', instructions: '["Mix"]' })
      .returning()
      .execute();
    const recipe = recipeResult[0];

    // Add recipe ingredient with decimal quantity
    await db.insert(recipeIngredientsTable)
      .values({
        recipe_id: recipe.id,
        ingredient_id: ingredient.id,
        quantity: 0.75,
        unit: 'tsp',
        notes: null
      })
      .execute();

    const result = await getRecipeDetails(recipe.id);

    expect(result).not.toBeNull();
    expect(result!.ingredients).toHaveLength(1);
    expect(result!.ingredients[0].quantity).toBe(0.75);
    expect(typeof result!.ingredients[0].quantity).toBe('number');
    expect(result!.ingredients[0].ingredient_name).toBe('Salt');
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recipesTable, recipeIngredientsTable, ingredientsTable } from '../db/schema';
import { type CreateRecipeInput } from '../schema';
import { createRecipe } from '../handlers/create_recipe';
import { eq } from 'drizzle-orm';

// Create test ingredients first (prerequisite data)
const createTestIngredients = async () => {
  const ingredientResults = await db.insert(ingredientsTable)
    .values([
      { name: 'Flour', category: 'Baking', unit: 'cup' },
      { name: 'Sugar', category: 'Baking', unit: 'cup' },
      { name: 'Eggs', category: 'Dairy', unit: 'piece' }
    ])
    .returning()
    .execute();
  
  return ingredientResults;
};

// Simple test input without ingredients
const basicRecipeInput: CreateRecipeInput = {
  title: 'Test Recipe',
  description: 'A simple test recipe',
  instructions: '["Step 1: Mix ingredients", "Step 2: Bake"]',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'American',
  tags: '["quick", "easy"]',
  image_url: 'https://example.com/image.jpg',
  ingredients: []
};

describe('createRecipe', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a recipe without ingredients', async () => {
    const result = await createRecipe(basicRecipeInput);

    // Basic field validation
    expect(result.title).toEqual('Test Recipe');
    expect(result.description).toEqual('A simple test recipe');
    expect(result.instructions).toEqual('["Step 1: Mix ingredients", "Step 2: Bake"]');
    expect(result.prep_time).toEqual(15);
    expect(result.cook_time).toEqual(30);
    expect(result.servings).toEqual(4);
    expect(result.difficulty).toEqual('easy');
    expect(result.cuisine).toEqual('American');
    expect(result.tags).toEqual('["quick", "easy"]');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save recipe to database', async () => {
    const result = await createRecipe(basicRecipeInput);

    // Query using proper drizzle syntax
    const recipes = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, result.id))
      .execute();

    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toEqual('Test Recipe');
    expect(recipes[0].description).toEqual('A simple test recipe');
    expect(recipes[0].prep_time).toEqual(15);
    expect(recipes[0].cook_time).toEqual(30);
    expect(recipes[0].servings).toEqual(4);
    expect(recipes[0].difficulty).toEqual('easy');
    expect(recipes[0].created_at).toBeInstanceOf(Date);
  });

  it('should create recipe with ingredients', async () => {
    // Create prerequisite ingredients
    const testIngredients = await createTestIngredients();
    
    const recipeWithIngredientsInput: CreateRecipeInput = {
      ...basicRecipeInput,
      title: 'Recipe with Ingredients',
      ingredients: [
        {
          ingredient_id: testIngredients[0].id,
          quantity: 2,
          unit: 'cups',
          notes: 'all-purpose flour'
        },
        {
          ingredient_id: testIngredients[1].id,
          quantity: 1,
          unit: 'cup',
          notes: null
        },
        {
          ingredient_id: testIngredients[2].id,
          quantity: 3,
          unit: 'pieces',
          notes: 'large eggs'
        }
      ]
    };

    const result = await createRecipe(recipeWithIngredientsInput);

    // Verify recipe was created
    expect(result.title).toEqual('Recipe with Ingredients');
    expect(result.id).toBeDefined();

    // Verify recipe ingredients were created
    const recipeIngredients = await db.select()
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipe_id, result.id))
      .execute();

    expect(recipeIngredients).toHaveLength(3);
    
    // Check first ingredient
    const firstIngredient = recipeIngredients.find(ri => ri.ingredient_id === testIngredients[0].id);
    expect(firstIngredient).toBeDefined();
    expect(firstIngredient!.quantity).toEqual(2);
    expect(firstIngredient!.unit).toEqual('cups');
    expect(firstIngredient!.notes).toEqual('all-purpose flour');

    // Check second ingredient (no notes)
    const secondIngredient = recipeIngredients.find(ri => ri.ingredient_id === testIngredients[1].id);
    expect(secondIngredient).toBeDefined();
    expect(secondIngredient!.quantity).toEqual(1);
    expect(secondIngredient!.unit).toEqual('cup');
    expect(secondIngredient!.notes).toBeNull();

    // Check third ingredient
    const thirdIngredient = recipeIngredients.find(ri => ri.ingredient_id === testIngredients[2].id);
    expect(thirdIngredient).toBeDefined();
    expect(thirdIngredient!.quantity).toEqual(3);
    expect(thirdIngredient!.unit).toEqual('pieces');
    expect(thirdIngredient!.notes).toEqual('large eggs');
  });

  it('should handle nullable fields correctly', async () => {
    const minimalRecipeInput: CreateRecipeInput = {
      title: 'Minimal Recipe',
      description: null,
      instructions: 'Simple instructions',
      prep_time: null,
      cook_time: null,
      servings: null,
      difficulty: null,
      cuisine: null,
      tags: null,
      image_url: null,
      ingredients: []
    };

    const result = await createRecipe(minimalRecipeInput);

    expect(result.title).toEqual('Minimal Recipe');
    expect(result.description).toBeNull();
    expect(result.instructions).toEqual('Simple instructions');
    expect(result.prep_time).toBeNull();
    expect(result.cook_time).toBeNull();
    expect(result.servings).toBeNull();
    expect(result.difficulty).toBeNull();
    expect(result.cuisine).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should handle empty ingredients array', async () => {
    const result = await createRecipe({
      ...basicRecipeInput,
      ingredients: []
    });

    // Verify recipe was created
    expect(result.id).toBeDefined();

    // Verify no recipe ingredients were created
    const recipeIngredients = await db.select()
      .from(recipeIngredientsTable)
      .where(eq(recipeIngredientsTable.recipe_id, result.id))
      .execute();

    expect(recipeIngredients).toHaveLength(0);
  });

  it('should fail when referencing non-existent ingredient', async () => {
    const invalidRecipeInput: CreateRecipeInput = {
      ...basicRecipeInput,
      ingredients: [
        {
          ingredient_id: 99999, // Non-existent ingredient ID
          quantity: 1,
          unit: 'cup',
          notes: null
        }
      ]
    };

    await expect(createRecipe(invalidRecipeInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
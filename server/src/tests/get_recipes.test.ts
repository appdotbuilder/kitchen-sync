import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recipesTable, ingredientsTable, recipeIngredientsTable } from '../db/schema';
import { type CreateRecipeInput } from '../schema';
import { getRecipes } from '../handlers/get_recipes';

describe('getRecipes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no recipes exist', async () => {
    const result = await getRecipes();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all recipes from database', async () => {
    // Create test recipes directly in database
    const testRecipes = [
      {
        title: 'Chocolate Chip Cookies',
        description: 'Classic homemade cookies',
        instructions: JSON.stringify(['Mix ingredients', 'Bake at 350°F']),
        prep_time: 15,
        cook_time: 12,
        servings: 24,
        difficulty: 'easy' as const,
        cuisine: 'American',
        tags: JSON.stringify(['dessert', 'cookies', 'baking']),
        image_url: 'https://example.com/cookies.jpg'
      },
      {
        title: 'Vegetable Stir Fry',
        description: 'Quick and healthy dinner',
        instructions: JSON.stringify(['Heat oil', 'Add vegetables', 'Stir fry for 5 minutes']),
        prep_time: 10,
        cook_time: 8,
        servings: 4,
        difficulty: 'medium' as const,
        cuisine: 'Asian',
        tags: JSON.stringify(['dinner', 'healthy', 'vegetarian']),
        image_url: null
      },
      {
        title: 'Simple Pasta',
        description: null,
        instructions: JSON.stringify(['Boil water', 'Cook pasta', 'Add sauce']),
        prep_time: null,
        cook_time: null,
        servings: null,
        difficulty: null,
        cuisine: null,
        tags: null,
        image_url: null
      }
    ];

    // Insert test recipes
    const insertedRecipes = await db.insert(recipesTable)
      .values(testRecipes)
      .returning()
      .execute();

    const result = await getRecipes();

    // Verify we get all recipes
    expect(result).toHaveLength(3);
    expect(Array.isArray(result)).toBe(true);

    // Verify first recipe data
    const cookieRecipe = result.find(r => r.title === 'Chocolate Chip Cookies');
    expect(cookieRecipe).toBeDefined();
    expect(cookieRecipe?.description).toBe('Classic homemade cookies');
    expect(cookieRecipe?.prep_time).toBe(15);
    expect(cookieRecipe?.cook_time).toBe(12);
    expect(cookieRecipe?.servings).toBe(24);
    expect(cookieRecipe?.difficulty).toBe('easy');
    expect(cookieRecipe?.cuisine).toBe('American');
    expect(cookieRecipe?.tags).toBe(JSON.stringify(['dessert', 'cookies', 'baking']));
    expect(cookieRecipe?.image_url).toBe('https://example.com/cookies.jpg');
    expect(cookieRecipe?.id).toBeDefined();
    expect(cookieRecipe?.created_at).toBeInstanceOf(Date);
    expect(cookieRecipe?.updated_at).toBeInstanceOf(Date);

    // Verify second recipe with different data
    const stirFryRecipe = result.find(r => r.title === 'Vegetable Stir Fry');
    expect(stirFryRecipe).toBeDefined();
    expect(stirFryRecipe?.description).toBe('Quick and healthy dinner');
    expect(stirFryRecipe?.difficulty).toBe('medium');
    expect(stirFryRecipe?.image_url).toBeNull();

    // Verify recipe with null values
    const pastaRecipe = result.find(r => r.title === 'Simple Pasta');
    expect(pastaRecipe).toBeDefined();
    expect(pastaRecipe?.description).toBeNull();
    expect(pastaRecipe?.prep_time).toBeNull();
    expect(pastaRecipe?.cook_time).toBeNull();
    expect(pastaRecipe?.servings).toBeNull();
    expect(pastaRecipe?.difficulty).toBeNull();
    expect(pastaRecipe?.cuisine).toBeNull();
    expect(pastaRecipe?.tags).toBeNull();
    expect(pastaRecipe?.image_url).toBeNull();
  });

  it('should return recipes in database order', async () => {
    // Create recipes with specific order
    const recipe1 = await db.insert(recipesTable)
      .values({
        title: 'First Recipe',
        instructions: JSON.stringify(['Step 1']),
        description: 'First recipe description'
      })
      .returning()
      .execute();

    const recipe2 = await db.insert(recipesTable)
      .values({
        title: 'Second Recipe',
        instructions: JSON.stringify(['Step 1']),
        description: 'Second recipe description'
      })
      .returning()
      .execute();

    const result = await getRecipes();

    expect(result).toHaveLength(2);
    
    // Verify the order matches insertion order (database default)
    expect(result[0].title).toBe('First Recipe');
    expect(result[1].title).toBe('Second Recipe');
    
    // Verify IDs are sequential
    expect(result[0].id).toBeLessThan(result[1].id);
  });

  it('should handle recipes with all nullable fields as null', async () => {
    // Create recipe with only required fields
    await db.insert(recipesTable)
      .values({
        title: 'Minimal Recipe',
        instructions: JSON.stringify(['Just one step'])
        // All other fields default to null
      })
      .execute();

    const result = await getRecipes();

    expect(result).toHaveLength(1);
    const recipe = result[0];
    
    expect(recipe.title).toBe('Minimal Recipe');
    expect(recipe.instructions).toBe(JSON.stringify(['Just one step']));
    expect(recipe.description).toBeNull();
    expect(recipe.prep_time).toBeNull();
    expect(recipe.cook_time).toBeNull();
    expect(recipe.servings).toBeNull();
    expect(recipe.difficulty).toBeNull();
    expect(recipe.cuisine).toBeNull();
    expect(recipe.tags).toBeNull();
    expect(recipe.image_url).toBeNull();
    expect(recipe.id).toBeDefined();
    expect(recipe.created_at).toBeInstanceOf(Date);
    expect(recipe.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct data types for all fields', async () => {
    await db.insert(recipesTable)
      .values({
        title: 'Type Test Recipe',
        description: 'Testing data types',
        instructions: JSON.stringify(['Step 1', 'Step 2']),
        prep_time: 30,
        cook_time: 45,
        servings: 6,
        difficulty: 'hard' as const,
        cuisine: 'French',
        tags: JSON.stringify(['test', 'types']),
        image_url: 'https://example.com/test.jpg'
      })
      .execute();

    const result = await getRecipes();
    const recipe = result[0];

    // Verify data types
    expect(typeof recipe.id).toBe('number');
    expect(typeof recipe.title).toBe('string');
    expect(typeof recipe.description).toBe('string');
    expect(typeof recipe.instructions).toBe('string');
    expect(typeof recipe.prep_time).toBe('number');
    expect(typeof recipe.cook_time).toBe('number');
    expect(typeof recipe.servings).toBe('number');
    expect(typeof recipe.difficulty).toBe('string');
    expect(typeof recipe.cuisine).toBe('string');
    expect(typeof recipe.tags).toBe('string');
    expect(typeof recipe.image_url).toBe('string');
    expect(recipe.created_at).toBeInstanceOf(Date);
    expect(recipe.updated_at).toBeInstanceOf(Date);
  });

  it('should work with large number of recipes', async () => {
    // Create many recipes to test performance and handling
    const manyRecipes = Array.from({ length: 50 }, (_, i) => ({
      title: `Recipe ${i + 1}`,
      description: `Description for recipe ${i + 1}`,
      instructions: JSON.stringify([`Step 1 for recipe ${i + 1}`]),
      prep_time: 10 + i,
      cook_time: 15 + i,
      servings: 2 + (i % 4),
      difficulty: ['easy', 'medium', 'hard'][i % 3] as 'easy' | 'medium' | 'hard',
      cuisine: ['Italian', 'French', 'Mexican', 'Asian'][i % 4],
      tags: JSON.stringify([`tag${i}`]),
      image_url: `https://example.com/recipe${i}.jpg`
    }));

    await db.insert(recipesTable)
      .values(manyRecipes)
      .execute();

    const result = await getRecipes();

    expect(result).toHaveLength(50);
    
    // Verify some sample data
    expect(result[0].title).toBe('Recipe 1');
    expect(result[49].title).toBe('Recipe 50');
    
    // Verify all have required fields
    result.forEach(recipe => {
      expect(recipe.id).toBeDefined();
      expect(recipe.title).toBeDefined();
      expect(recipe.instructions).toBeDefined();
      expect(recipe.created_at).toBeInstanceOf(Date);
      expect(recipe.updated_at).toBeInstanceOf(Date);
    });
  });
});
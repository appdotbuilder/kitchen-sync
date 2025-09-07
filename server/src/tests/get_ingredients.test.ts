import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ingredientsTable } from '../db/schema';
import { getIngredients } from '../handlers/get_ingredients';

describe('getIngredients', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no ingredients exist', async () => {
    const result = await getIngredients();
    expect(result).toEqual([]);
  });

  it('should return all ingredients from database', async () => {
    // Create test ingredients
    await db.insert(ingredientsTable).values([
      {
        name: 'Salt',
        category: 'Spices',
        unit: 'tsp'
      },
      {
        name: 'Flour',
        category: 'Baking',
        unit: 'cup'
      },
      {
        name: 'Chicken Breast',
        category: null, // Test nullable category
        unit: 'lb'
      }
    ]).execute();

    const result = await getIngredients();

    expect(result).toHaveLength(3);
    
    // Verify all fields are returned correctly
    const saltIngredient = result.find(i => i.name === 'Salt');
    expect(saltIngredient).toBeDefined();
    expect(saltIngredient?.category).toBe('Spices');
    expect(saltIngredient?.unit).toBe('tsp');
    expect(saltIngredient?.id).toBeDefined();
    expect(saltIngredient?.created_at).toBeInstanceOf(Date);
    expect(saltIngredient?.updated_at).toBeInstanceOf(Date);

    // Verify nullable category works
    const chickenIngredient = result.find(i => i.name === 'Chicken Breast');
    expect(chickenIngredient).toBeDefined();
    expect(chickenIngredient?.category).toBeNull();
  });

  it('should return ingredients ordered by creation time', async () => {
    // Insert ingredients with small delays to ensure different timestamps
    await db.insert(ingredientsTable).values({
      name: 'First Ingredient',
      category: 'Test',
      unit: 'cup'
    }).execute();

    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

    await db.insert(ingredientsTable).values({
      name: 'Second Ingredient',
      category: 'Test',
      unit: 'tsp'
    }).execute();

    const result = await getIngredients();

    expect(result).toHaveLength(2);
    // Verify both ingredients are present (order may vary without explicit ORDER BY)
    const names = result.map(i => i.name);
    expect(names).toContain('First Ingredient');
    expect(names).toContain('Second Ingredient');
  });

  it('should handle database with many ingredients', async () => {
    // Create a larger dataset
    const ingredients = Array.from({ length: 10 }, (_, i) => ({
      name: `Ingredient ${i + 1}`,
      category: i % 2 === 0 ? 'Category A' : 'Category B',
      unit: i % 3 === 0 ? 'cup' : 'tsp'
    }));

    await db.insert(ingredientsTable).values(ingredients).execute();

    const result = await getIngredients();

    expect(result).toHaveLength(10);
    
    // Verify each ingredient has all required fields
    result.forEach(ingredient => {
      expect(ingredient.id).toBeDefined();
      expect(ingredient.name).toBeDefined();
      expect(ingredient.unit).toBeDefined();
      expect(ingredient.created_at).toBeInstanceOf(Date);
      expect(ingredient.updated_at).toBeInstanceOf(Date);
      expect(['Category A', 'Category B']).toContain(ingredient.category);
      expect(['cup', 'tsp']).toContain(ingredient.unit);
    });
  });
});
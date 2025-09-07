import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ingredientsTable } from '../db/schema';
import { type CreateIngredientInput } from '../schema';
import { createIngredient } from '../handlers/create_ingredient';
import { eq } from 'drizzle-orm';

// Test input variations
const basicInput: CreateIngredientInput = {
  name: 'Tomato',
  category: 'Vegetables',
  unit: 'piece'
};

const inputWithNullCategory: CreateIngredientInput = {
  name: 'Salt',
  category: null,
  unit: 'teaspoon'
};

const inputWithLongName: CreateIngredientInput = {
  name: 'Extra Virgin Olive Oil from Mediterranean Region',
  category: 'Oils & Vinegars',
  unit: 'tablespoon'
};

describe('createIngredient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an ingredient with all fields', async () => {
    const result = await createIngredient(basicInput);

    // Basic field validation
    expect(result.name).toEqual('Tomato');
    expect(result.category).toEqual('Vegetables');
    expect(result.unit).toEqual('piece');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an ingredient with null category', async () => {
    const result = await createIngredient(inputWithNullCategory);

    expect(result.name).toEqual('Salt');
    expect(result.category).toBeNull();
    expect(result.unit).toEqual('teaspoon');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save ingredient to database', async () => {
    const result = await createIngredient(basicInput);

    // Query using proper drizzle syntax
    const ingredients = await db.select()
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, result.id))
      .execute();

    expect(ingredients).toHaveLength(1);
    expect(ingredients[0].name).toEqual('Tomato');
    expect(ingredients[0].category).toEqual('Vegetables');
    expect(ingredients[0].unit).toEqual('piece');
    expect(ingredients[0].created_at).toBeInstanceOf(Date);
    expect(ingredients[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle long ingredient names', async () => {
    const result = await createIngredient(inputWithLongName);

    expect(result.name).toEqual('Extra Virgin Olive Oil from Mediterranean Region');
    expect(result.category).toEqual('Oils & Vinegars');
    expect(result.unit).toEqual('tablespoon');
    expect(result.id).toBeDefined();
  });

  it('should create multiple ingredients with unique IDs', async () => {
    const result1 = await createIngredient(basicInput);
    const result2 = await createIngredient(inputWithNullCategory);
    const result3 = await createIngredient(inputWithLongName);

    // Verify all have different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).not.toEqual(result3.id);
    expect(result2.id).not.toEqual(result3.id);

    // Verify all are saved to database
    const allIngredients = await db.select()
      .from(ingredientsTable)
      .execute();

    expect(allIngredients).toHaveLength(3);
    
    const names = allIngredients.map(ing => ing.name).sort();
    expect(names).toEqual([
      'Extra Virgin Olive Oil from Mediterranean Region',
      'Salt', 
      'Tomato'
    ]);
  });

  it('should handle special characters in ingredient names', async () => {
    const specialInput: CreateIngredientInput = {
      name: 'Jalapeño Peppers & Cilantro',
      category: 'Herbs & Spices',
      unit: 'bunch'
    };

    const result = await createIngredient(specialInput);

    expect(result.name).toEqual('Jalapeño Peppers & Cilantro');
    expect(result.category).toEqual('Herbs & Spices');
    expect(result.unit).toEqual('bunch');

    // Verify it was saved correctly
    const savedIngredient = await db.select()
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, result.id))
      .execute();

    expect(savedIngredient[0].name).toEqual('Jalapeño Peppers & Cilantro');
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createIngredient(basicInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});
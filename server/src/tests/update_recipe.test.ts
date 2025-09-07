import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { recipesTable } from '../db/schema';
import { type UpdateRecipeInput } from '../schema';
import { updateRecipe } from '../handlers/update_recipe';
import { eq } from 'drizzle-orm';

// Sample recipe data for testing
const sampleRecipe = {
  title: 'Original Recipe',
  description: 'Original description',
  instructions: '["Step 1: Mix ingredients", "Step 2: Cook"]',
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  difficulty: 'medium' as const,
  cuisine: 'Italian',
  tags: '["pasta", "dinner"]',
  image_url: 'http://example.com/image.jpg'
};

describe('updateRecipe', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a recipe with all fields', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;

    // Update all fields
    const updateInput: UpdateRecipeInput = {
      id: recipeId,
      title: 'Updated Recipe',
      description: 'Updated description',
      instructions: '["Step 1: Updated mix", "Step 2: Updated cook"]',
      prep_time: 20,
      cook_time: 45,
      servings: 6,
      difficulty: 'hard',
      cuisine: 'French',
      tags: '["updated", "gourmet"]',
      image_url: 'http://example.com/updated.jpg'
    };

    const result = await updateRecipe(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(recipeId);
    expect(result!.title).toEqual('Updated Recipe');
    expect(result!.description).toEqual('Updated description');
    expect(result!.instructions).toEqual('["Step 1: Updated mix", "Step 2: Updated cook"]');
    expect(result!.prep_time).toEqual(20);
    expect(result!.cook_time).toEqual(45);
    expect(result!.servings).toEqual(6);
    expect(result!.difficulty).toEqual('hard');
    expect(result!.cuisine).toEqual('French');
    expect(result!.tags).toEqual('["updated", "gourmet"]');
    expect(result!.image_url).toEqual('http://example.com/updated.jpg');
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;
    const originalUpdatedAt = created[0].updated_at;

    // Update only title and prep_time
    const updateInput: UpdateRecipeInput = {
      id: recipeId,
      title: 'Partially Updated Recipe',
      prep_time: 25
    };

    const result = await updateRecipe(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(recipeId);
    expect(result!.title).toEqual('Partially Updated Recipe');
    expect(result!.prep_time).toEqual(25);
    
    // Other fields should remain unchanged
    expect(result!.description).toEqual('Original description');
    expect(result!.instructions).toEqual('["Step 1: Mix ingredients", "Step 2: Cook"]');
    expect(result!.cook_time).toEqual(30);
    expect(result!.servings).toEqual(4);
    expect(result!.difficulty).toEqual('medium');
    expect(result!.cuisine).toEqual('Italian');
    expect(result!.tags).toEqual('["pasta", "dinner"]');
    expect(result!.image_url).toEqual('http://example.com/image.jpg');
    
    // updated_at should be changed
    expect(result!.updated_at).not.toEqual(originalUpdatedAt);
  });

  it('should update nullable fields to null', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;

    // Update nullable fields to null
    const updateInput: UpdateRecipeInput = {
      id: recipeId,
      description: null,
      prep_time: null,
      cook_time: null,
      servings: null,
      difficulty: null,
      cuisine: null,
      tags: null,
      image_url: null
    };

    const result = await updateRecipe(updateInput);

    expect(result).toBeDefined();
    expect(result!.description).toBeNull();
    expect(result!.prep_time).toBeNull();
    expect(result!.cook_time).toBeNull();
    expect(result!.servings).toBeNull();
    expect(result!.difficulty).toBeNull();
    expect(result!.cuisine).toBeNull();
    expect(result!.tags).toBeNull();
    expect(result!.image_url).toBeNull();
    
    // Non-nullable fields should remain unchanged
    expect(result!.title).toEqual('Original Recipe');
    expect(result!.instructions).toEqual('["Step 1: Mix ingredients", "Step 2: Cook"]');
  });

  it('should return null for non-existent recipe', async () => {
    const updateInput: UpdateRecipeInput = {
      id: 99999,
      title: 'Non-existent Recipe'
    };

    const result = await updateRecipe(updateInput);
    expect(result).toBeNull();
  });

  it('should persist changes in database', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;

    // Update recipe
    const updateInput: UpdateRecipeInput = {
      id: recipeId,
      title: 'Database Test Recipe',
      servings: 8
    };

    await updateRecipe(updateInput);

    // Verify changes were persisted
    const recipes = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, recipeId))
      .execute();

    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toEqual('Database Test Recipe');
    expect(recipes[0].servings).toEqual(8);
    expect(recipes[0].description).toEqual('Original description'); // Unchanged
  });

  it('should handle edge case with only id provided', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;
    const originalUpdatedAt = created[0].updated_at;

    // Update with only id (no other fields)
    const updateInput: UpdateRecipeInput = {
      id: recipeId
    };

    const result = await updateRecipe(updateInput);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(recipeId);
    
    // All other fields should remain the same
    expect(result!.title).toEqual('Original Recipe');
    expect(result!.description).toEqual('Original description');
    
    // But updated_at should be changed
    expect(result!.updated_at).not.toEqual(originalUpdatedAt);
  });

  it('should validate difficulty enum values', async () => {
    // Create a recipe first
    const created = await db.insert(recipesTable)
      .values(sampleRecipe)
      .returning()
      .execute();

    const recipeId = created[0].id;

    // Test each valid difficulty value
    const difficulties = ['easy', 'medium', 'hard'] as const;
    
    for (const difficulty of difficulties) {
      const updateInput: UpdateRecipeInput = {
        id: recipeId,
        difficulty
      };

      const result = await updateRecipe(updateInput);
      expect(result).toBeDefined();
      expect(result!.difficulty).toEqual(difficulty);
    }
  });
});
import { db } from '../db';
import { recipesTable } from '../db/schema';
import { type UpdateRecipeInput, type Recipe } from '../schema';
import { eq } from 'drizzle-orm';

export const updateRecipe = async (input: UpdateRecipeInput): Promise<Recipe | null> => {
  try {
    const { id, ...updateFields } = input;

    // Check if recipe exists
    const existingRecipe = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, id))
      .execute();

    if (existingRecipe.length === 0) {
      return null;
    }

    // Build update object with only defined fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (updateFields.title !== undefined) {
      updateData.title = updateFields.title;
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description;
    }
    if (updateFields.instructions !== undefined) {
      updateData.instructions = updateFields.instructions;
    }
    if (updateFields.prep_time !== undefined) {
      updateData.prep_time = updateFields.prep_time;
    }
    if (updateFields.cook_time !== undefined) {
      updateData.cook_time = updateFields.cook_time;
    }
    if (updateFields.servings !== undefined) {
      updateData.servings = updateFields.servings;
    }
    if (updateFields.difficulty !== undefined) {
      updateData.difficulty = updateFields.difficulty;
    }
    if (updateFields.cuisine !== undefined) {
      updateData.cuisine = updateFields.cuisine;
    }
    if (updateFields.tags !== undefined) {
      updateData.tags = updateFields.tags;
    }
    if (updateFields.image_url !== undefined) {
      updateData.image_url = updateFields.image_url;
    }

    // Update the recipe
    const result = await db.update(recipesTable)
      .set(updateData)
      .where(eq(recipesTable.id, id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Recipe update failed:', error);
    throw error;
  }
};
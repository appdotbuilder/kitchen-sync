import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shoppingListsTable, mealPlansTable } from '../db/schema';
import { getShoppingLists } from '../handlers/get_shopping_lists';

describe('getShoppingLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no shopping lists exist', async () => {
    const result = await getShoppingLists();
    expect(result).toEqual([]);
  });

  it('should return all shopping lists', async () => {
    // Create test meal plan first
    const mealPlan = await db.insert(mealPlansTable)
      .values({
        name: 'Test Meal Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: 'Test meal plan'
      })
      .returning()
      .execute();

    // Create test shopping lists
    await db.insert(shoppingListsTable)
      .values([
        {
          name: 'Weekly Groceries',
          meal_plan_id: mealPlan[0].id
        },
        {
          name: 'Standalone List',
          meal_plan_id: null
        },
        {
          name: 'Party Shopping',
          meal_plan_id: null
        }
      ])
      .execute();

    const result = await getShoppingLists();

    expect(result).toHaveLength(3);
    
    // Sort by name for consistent testing
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    expect(result[0].name).toEqual('Party Shopping');
    expect(result[0].meal_plan_id).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Standalone List');
    expect(result[1].meal_plan_id).toBeNull();
    
    expect(result[2].name).toEqual('Weekly Groceries');
    expect(result[2].meal_plan_id).toEqual(mealPlan[0].id);
  });

  it('should return shopping lists with correct field types', async () => {
    // Create a shopping list without meal plan
    await db.insert(shoppingListsTable)
      .values({
        name: 'Test List',
        meal_plan_id: null
      })
      .execute();

    const result = await getShoppingLists();

    expect(result).toHaveLength(1);
    
    const shoppingList = result[0];
    expect(typeof shoppingList.id).toEqual('number');
    expect(typeof shoppingList.name).toEqual('string');
    expect(shoppingList.meal_plan_id).toBeNull();
    expect(shoppingList.created_at).toBeInstanceOf(Date);
    expect(shoppingList.updated_at).toBeInstanceOf(Date);
  });

  it('should handle shopping lists with meal plan references', async () => {
    // Create multiple meal plans
    const mealPlans = await db.insert(mealPlansTable)
      .values([
        {
          name: 'Plan A',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-07'),
          description: null
        },
        {
          name: 'Plan B',
          start_date: new Date('2024-01-08'),
          end_date: new Date('2024-01-14'),
          description: 'Second plan'
        }
      ])
      .returning()
      .execute();

    // Create shopping lists for both meal plans
    await db.insert(shoppingListsTable)
      .values([
        {
          name: 'Plan A Shopping',
          meal_plan_id: mealPlans[0].id
        },
        {
          name: 'Plan B Shopping',
          meal_plan_id: mealPlans[1].id
        }
      ])
      .execute();

    const result = await getShoppingLists();

    expect(result).toHaveLength(2);
    
    const planAList = result.find(list => list.name === 'Plan A Shopping');
    const planBList = result.find(list => list.name === 'Plan B Shopping');
    
    expect(planAList).toBeDefined();
    expect(planAList!.meal_plan_id).toEqual(mealPlans[0].id);
    
    expect(planBList).toBeDefined();
    expect(planBList!.meal_plan_id).toEqual(mealPlans[1].id);
  });
});
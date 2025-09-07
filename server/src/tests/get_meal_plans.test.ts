import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { mealPlansTable } from '../db/schema';
import { type CreateMealPlanInput } from '../schema';
import { getMealPlans } from '../handlers/get_meal_plans';

// Test data for meal plans
const testMealPlan1: CreateMealPlanInput = {
  name: 'Weekly Meal Plan',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-07'),
  description: 'A healthy meal plan for the week'
};

const testMealPlan2: CreateMealPlanInput = {
  name: 'Holiday Menu',
  start_date: new Date('2024-12-20'),
  end_date: new Date('2024-12-25'),
  description: null
};

describe('getMealPlans', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no meal plans exist', async () => {
    const result = await getMealPlans();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch single meal plan', async () => {
    // Create test meal plan
    await db.insert(mealPlansTable)
      .values(testMealPlan1)
      .execute();

    const result = await getMealPlans();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Weekly Meal Plan');
    expect(result[0].description).toEqual('A healthy meal plan for the week');
    expect(result[0].start_date).toBeInstanceOf(Date);
    expect(result[0].end_date).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple meal plans', async () => {
    // Create multiple test meal plans
    await db.insert(mealPlansTable)
      .values([testMealPlan1, testMealPlan2])
      .execute();

    const result = await getMealPlans();

    expect(result).toHaveLength(2);
    
    // Verify first meal plan
    const weeklyPlan = result.find(plan => plan.name === 'Weekly Meal Plan');
    expect(weeklyPlan).toBeDefined();
    expect(weeklyPlan!.description).toEqual('A healthy meal plan for the week');
    expect(weeklyPlan!.start_date).toBeInstanceOf(Date);
    expect(weeklyPlan!.end_date).toBeInstanceOf(Date);

    // Verify second meal plan
    const holidayPlan = result.find(plan => plan.name === 'Holiday Menu');
    expect(holidayPlan).toBeDefined();
    expect(holidayPlan!.description).toBeNull();
    expect(holidayPlan!.start_date).toBeInstanceOf(Date);
    expect(holidayPlan!.end_date).toBeInstanceOf(Date);

    // Verify all have required fields
    result.forEach(plan => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.start_date).toBeInstanceOf(Date);
      expect(plan.end_date).toBeInstanceOf(Date);
      expect(plan.created_at).toBeInstanceOf(Date);
      expect(plan.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle date fields correctly', async () => {
    // Create meal plan with specific dates
    const specificDates = {
      name: 'Date Test Plan',
      start_date: new Date('2024-06-01T10:00:00Z'),
      end_date: new Date('2024-06-30T23:59:59Z'),
      description: 'Testing date handling'
    };

    await db.insert(mealPlansTable)
      .values(specificDates)
      .execute();

    const result = await getMealPlans();

    expect(result).toHaveLength(1);
    const plan = result[0];
    
    expect(plan.start_date).toBeInstanceOf(Date);
    expect(plan.end_date).toBeInstanceOf(Date);
    expect(plan.created_at).toBeInstanceOf(Date);
    expect(plan.updated_at).toBeInstanceOf(Date);
    
    // Verify dates are properly parsed
    expect(plan.start_date.getFullYear()).toEqual(2024);
    expect(plan.start_date.getMonth()).toEqual(5); // June (0-indexed)
    expect(plan.end_date.getFullYear()).toEqual(2024);
    expect(plan.end_date.getMonth()).toEqual(5); // June (0-indexed)
  });
});
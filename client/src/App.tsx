import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, BookOpen, Calendar, ShoppingCart, Star } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { Recipe, MealPlan, ShoppingList, Ingredient } from '../../server/src/schema';

// Import components
import { RecipeManager } from '@/components/RecipeManager';
import { MealPlanManager } from '@/components/MealPlanManager';
import { ShoppingListManager } from '@/components/ShoppingListManager';
import { IngredientManager } from '@/components/IngredientManager';
import { CookingMode } from '@/components/CookingMode';

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeTab, setActiveTab] = useState('recipes');
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);

  // Load data from API
  const loadRecipes = useCallback(async () => {
    try {
      const result = await trpc.getRecipes.query();
      setRecipes(result);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }, []);

  const loadMealPlans = useCallback(async () => {
    try {
      const result = await trpc.getMealPlans.query();
      setMealPlans(result);
    } catch (error) {
      console.error('Failed to load meal plans:', error);
    }
  }, []);

  const loadShoppingLists = useCallback(async () => {
    try {
      const result = await trpc.getShoppingLists.query();
      setShoppingLists(result);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    }
  }, []);

  const loadIngredients = useCallback(async () => {
    try {
      const result = await trpc.getIngredients.query();
      setIngredients(result);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
    loadMealPlans();
    loadShoppingLists();
    loadIngredients();
  }, [loadRecipes, loadMealPlans, loadShoppingLists, loadIngredients]);

  // Handle cooking mode
  const startCooking = (recipe: Recipe) => {
    setCookingRecipe(recipe);
    setActiveTab('cooking');
  };

  const exitCookingMode = () => {
    setCookingRecipe(null);
    setActiveTab('recipes');
  };

  if (cookingRecipe && activeTab === 'cooking') {
    return <CookingMode recipe={cookingRecipe} onExit={exitCookingMode} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold text-gray-800">Kitchen Companion</h1>
            <ChefHat className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-lg text-gray-600">Your personal cooking assistant 👨‍🍳</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <BookOpen className="w-5 h-5" />
                Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{recipes.length}</div>
              <p className="text-sm text-gray-600">Total recipes</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Calendar className="w-5 h-5" />
                Meal Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{mealPlans.length}</div>
              <p className="text-sm text-gray-600">Active plans</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <ShoppingCart className="w-5 h-5" />
                Shopping Lists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{shoppingLists.length}</div>
              <p className="text-sm text-gray-600">Shopping lists</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <ChefHat className="w-5 h-5" />
                Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{ingredients.length}</div>
              <p className="text-sm text-gray-600">Available ingredients</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Recipes
            </TabsTrigger>
            <TabsTrigger value="meal-plans" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Meal Plans
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Shopping
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="cooking" disabled={!cookingRecipe} className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Cooking
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="recipes" className="space-y-6">
              <RecipeManager 
                recipes={recipes} 
                ingredients={ingredients}
                onRecipeUpdate={loadRecipes}
                onStartCooking={startCooking}
              />
            </TabsContent>

            <TabsContent value="meal-plans" className="space-y-6">
              <MealPlanManager 
                mealPlans={mealPlans}
                recipes={recipes}
                onMealPlanUpdate={loadMealPlans}
                onShoppingListGenerated={loadShoppingLists}
              />
            </TabsContent>

            <TabsContent value="shopping" className="space-y-6">
              <ShoppingListManager 
                shoppingLists={shoppingLists}
                mealPlans={mealPlans}
                onShoppingListUpdate={loadShoppingLists}
              />
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-6">
              <IngredientManager 
                ingredients={ingredients}
                onIngredientUpdate={loadIngredients}
              />
            </TabsContent>

            <TabsContent value="cooking" className="space-y-6">
              {cookingRecipe ? (
                <CookingMode recipe={cookingRecipe} onExit={exitCookingMode} />
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg text-gray-600 mb-4">No cooking session active</p>
                      <p className="text-sm text-gray-500">Select a recipe from the Recipes tab to start cooking!</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
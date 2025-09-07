import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ChefHat, Search } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { Ingredient, CreateIngredientInput } from '../../../server/src/schema';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  onIngredientUpdate: () => void;
}

export function IngredientManager({ ingredients, onIngredientUpdate }: IngredientManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [formData, setFormData] = useState<CreateIngredientInput>({
    name: '',
    category: null,
    unit: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: null,
      unit: ''
    });
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit) return;

    setIsLoading(true);
    try {
      await trpc.createIngredient.mutate(formData);
      onIngredientUpdate();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create ingredient:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(
    ingredients
      .map(ingredient => ingredient.category)
      .filter(Boolean)
  )).sort() as string[];

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ingredient.category && ingredient.category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      ingredient.category === selectedCategory ||
      (selectedCategory === 'uncategorized' && !ingredient.category);

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors = {
      'vegetables': 'bg-green-100 text-green-800',
      'fruits': 'bg-red-100 text-red-800',
      'proteins': 'bg-orange-100 text-orange-800',
      'dairy': 'bg-blue-100 text-blue-800',
      'grains': 'bg-yellow-100 text-yellow-800',
      'spices': 'bg-purple-100 text-purple-800',
      'herbs': 'bg-emerald-100 text-emerald-800',
      'oils': 'bg-amber-100 text-amber-800',
      'condiments': 'bg-pink-100 text-pink-800',
      'pantry': 'bg-cyan-100 text-cyan-800',
    };
    
    return colors[category.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryEmoji = (category: string | null) => {
    if (!category) return '📦';
    
    const emojis = {
      'vegetables': '🥬',
      'fruits': '🍎',
      'proteins': '🥩',
      'dairy': '🥛',
      'grains': '🌾',
      'spices': '🌶️',
      'herbs': '🌿',
      'oils': '🫒',
      'condiments': '🍯',
      'pantry': '🥫',
    };
    
    return emojis[category.toLowerCase() as keyof typeof emojis] || '📦';
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-purple-500" />
            Ingredient Library 🥘
          </h2>
          <p className="text-gray-600">Manage your cooking ingredients</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Ingredient</DialogTitle>
              <DialogDescription>
                Add a new ingredient to your library for use in recipes
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateIngredient} className="space-y-4">
              <div>
                <Label htmlFor="name">Ingredient Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateIngredientInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Tomatoes, Olive Oil, Salt..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateIngredientInput) => ({ ...prev, category: e.target.value || null }))
                  }
                  placeholder="Vegetables, Proteins, Spices..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Popular categories: vegetables, fruits, proteins, dairy, grains, spices, herbs, oils, condiments
                </p>
              </div>

              <div>
                <Label htmlFor="unit">Default Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateIngredientInput) => ({ ...prev, unit: e.target.value }))
                  }
                  placeholder="cup, tbsp, gram, piece..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common units: cup, tbsp, tsp, gram, kg, lb, oz, piece, clove, bunch
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name || !formData.unit}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {isLoading ? 'Adding...' : 'Add Ingredient'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search ingredients... 🔍"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All ({ingredients.length})
          </Button>
          {categories.map(category => {
            const count = ingredients.filter(ing => ing.category === category).length;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="flex items-center gap-1"
              >
                {getCategoryEmoji(category)}
                {category} ({count})
              </Button>
            );
          })}
          {ingredients.some(ing => !ing.category) && (
            <Button
              variant={selectedCategory === 'uncategorized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('uncategorized')}
            >
              📦 Uncategorized ({ingredients.filter(ing => !ing.category).length})
            </Button>
          )}
        </div>
      </div>

      {/* Ingredients Grid */}
      {filteredIngredients.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600 mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No ingredients found' : 'No ingredients yet'}
              </p>
              <p className="text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter'
                  : 'Add your first ingredient to start building recipes! 🥘'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIngredients.map((ingredient: Ingredient) => (
            <Card key={ingredient.id} className="hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getCategoryEmoji(ingredient.category)}
                    {ingredient.name}
                  </CardTitle>
                  {ingredient.category && (
                    <Badge className={getCategoryColor(ingredient.category)} style={{ fontSize: '0.7rem' }}>
                      {ingredient.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Default unit:</span>
                    <Badge variant="outline">{ingredient.unit}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Added:</span>
                    <span>{formatDate(ingredient.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {ingredients.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Ingredient Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">{ingredients.length}</div>
                <div className="text-sm text-gray-600">Total Ingredients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {ingredients.filter(ing => ing.category).length}
                </div>
                <div className="text-sm text-gray-600">Categorized</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {ingredients.filter(ing => !ing.category).length}
                </div>
                <div className="text-sm text-gray-600">Uncategorized</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Categories */}
      {categories.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">📂 Categories</CardTitle>
            <CardDescription>Browse ingredients by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const count = ingredients.filter(ing => ing.category === category).length;
                return (
                  <Button
                    key={category}
                    variant="ghost"
                    className={`flex items-center gap-2 ${
                      selectedCategory === category 
                        ? 'bg-purple-100 text-purple-800 border-purple-300' 
                        : 'hover:bg-purple-50'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {getCategoryEmoji(category)}
                    <span>{category}</span>
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
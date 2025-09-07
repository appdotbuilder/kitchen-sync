import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, ShoppingCart, Eye, CheckCircle, Package } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { 
  ShoppingList, 
  MealPlan, 
  CreateShoppingListInput, 
  CreateShoppingListItemInput,
  ShoppingListItem,
  UpdateShoppingListItemInput
} from '../../../server/src/schema';

interface ShoppingListManagerProps {
  shoppingLists: ShoppingList[];
  mealPlans: MealPlan[];
  onShoppingListUpdate: () => void;
}

interface ShoppingListWithItems extends ShoppingList {
  items?: ShoppingListItem[];
}

export function ShoppingListManager({ 
  shoppingLists, 
  mealPlans, 
  onShoppingListUpdate 
}: ShoppingListManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingListWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateShoppingListInput>({
    name: '',
    meal_plan_id: null
  });

  const [itemFormData, setItemFormData] = useState<CreateShoppingListItemInput>({
    shopping_list_id: 0,
    ingredient_id: null,
    name: '',
    quantity: null,
    unit: null,
    category: null,
    notes: null
  });

  const resetForm = () => {
    setFormData({
      name: '',
      meal_plan_id: null
    });
  };

  const resetItemForm = () => {
    setItemFormData({
      shopping_list_id: 0,
      ingredient_id: null,
      name: '',
      quantity: null,
      unit: null,
      category: null,
      notes: null
    });
  };

  const handleCreateShoppingList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsLoading(true);
    try {
      await trpc.createShoppingList.mutate(formData);
      onShoppingListUpdate();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name || !itemFormData.shopping_list_id) return;

    setIsLoading(true);
    try {
      await trpc.createShoppingListItem.mutate(itemFormData);
      // Refresh shopping list details
      if (selectedShoppingList) {
        await loadShoppingListDetails(selectedShoppingList.id);
      }
      setIsAddItemDialogOpen(false);
      resetItemForm();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadShoppingListDetails = useCallback(async (shoppingListId: number) => {
    try {
      const details = await trpc.getShoppingListDetails.query({ id: shoppingListId });
      setSelectedShoppingList(details as ShoppingListWithItems);
    } catch (error) {
      console.error('Failed to load shopping list details:', error);
    }
  }, []);

  const viewShoppingListDetails = async (shoppingList: ShoppingList) => {
    await loadShoppingListDetails(shoppingList.id);
    setIsDetailsDialogOpen(true);
  };

  const toggleItemPurchased = async (item: ShoppingListItem) => {
    try {
      const updateData: UpdateShoppingListItemInput = {
        id: item.id,
        is_purchased: !item.is_purchased
      };
      await trpc.updateShoppingListItem.mutate(updateData);
      
      // Update local state
      if (selectedShoppingList) {
        setSelectedShoppingList(prev => ({
          ...prev!,
          items: prev!.items?.map(i => 
            i.id === item.id 
              ? { ...i, is_purchased: !i.is_purchased }
              : i
          )
        }));
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors = {
      'produce': 'bg-green-100 text-green-800',
      'dairy': 'bg-blue-100 text-blue-800',
      'meat': 'bg-red-100 text-red-800',
      'pantry': 'bg-yellow-100 text-yellow-800',
      'frozen': 'bg-cyan-100 text-cyan-800',
      'bakery': 'bg-orange-100 text-orange-800',
      'beverages': 'bg-purple-100 text-purple-800',
      'snacks': 'bg-pink-100 text-pink-800',
    };
    
    return colors[category.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Group items by category
  const groupItemsByCategory = (items: ShoppingListItem[]) => {
    return items.reduce((groups, item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, ShoppingListItem[]>);
  };

  // Calculate progress
  const calculateProgress = (items?: ShoppingListItem[]) => {
    if (!items || items.length === 0) return { purchased: 0, total: 0, percentage: 0 };
    
    const purchased = items.filter(item => item.is_purchased).length;
    const total = items.length;
    const percentage = Math.round((purchased / total) * 100);
    
    return { purchased, total, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-500" />
            Shopping Lists 🛒
          </h2>
          <p className="text-gray-600">Organize your grocery shopping</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              New Shopping List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shopping List</DialogTitle>
              <DialogDescription>
                Create a shopping list from scratch or from a meal plan
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateShoppingList} className="space-y-4">
              <div>
                <Label htmlFor="name">List Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateShoppingListInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Weekly groceries..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="meal_plan">Based on Meal Plan (optional)</Label>
                <Select
                  value={formData.meal_plan_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    setFormData((prev: CreateShoppingListInput) => ({ 
                      ...prev, 
                      meal_plan_id: value === 'none' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meal plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Create from scratch</SelectItem>
                    {mealPlans.map((mealPlan: MealPlan) => (
                      <SelectItem key={mealPlan.id} value={mealPlan.id.toString()}>
                        {mealPlan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  disabled={isLoading || !formData.name}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isLoading ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shopping Lists Grid */}
      {shoppingLists.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600 mb-2">No shopping lists yet</p>
              <p className="text-sm text-gray-500">Create your first shopping list to stay organized! 🛍️</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shoppingLists.map((shoppingList: ShoppingList) => {
            const mealPlan = shoppingList.meal_plan_id 
              ? mealPlans.find(mp => mp.id === shoppingList.meal_plan_id)
              : null;

            return (
              <Card key={shoppingList.id} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {shoppingList.name}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div>Created: {formatDate(shoppingList.created_at)}</div>
                    {mealPlan && (
                      <Badge variant="outline" className="text-xs">
                        From: {mealPlan.name}
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => viewShoppingListDetails(shoppingList)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View & Shop
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Shopping List Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedShoppingList && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      {selectedShoppingList.name}
                    </DialogTitle>
                    <DialogDescription>
                      Created: {formatDate(selectedShoppingList.created_at)}
                      {(() => {
                        const progress = calculateProgress(selectedShoppingList.items);
                        return progress.total > 0 ? (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {progress.purchased} of {progress.total} items ({progress.percentage}%)
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </DialogDescription>
                  </div>
                  <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => setItemFormData(prev => ({ ...prev, shopping_list_id: selectedShoppingList.id }))}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Item to Shopping List</DialogTitle>
                        <DialogDescription>
                          Add a new item to your shopping list
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddItem} className="space-y-4">
                        <div>
                          <Label htmlFor="item_name">Item Name *</Label>
                          <Input
                            id="item_name"
                            value={itemFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setItemFormData((prev: CreateShoppingListItemInput) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Milk, Bread, Apples..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              step="0.1"
                              value={itemFormData.quantity || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setItemFormData((prev: CreateShoppingListItemInput) => ({ 
                                  ...prev, 
                                  quantity: parseFloat(e.target.value) || null 
                                }))
                              }
                              placeholder="2.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="unit">Unit</Label>
                            <Input
                              id="unit"
                              value={itemFormData.unit || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setItemFormData((prev: CreateShoppingListItemInput) => ({ 
                                  ...prev, 
                                  unit: e.target.value || null 
                                }))
                              }
                              placeholder="lbs, cups, pieces..."
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={itemFormData.category || 'other'}
                            onValueChange={(value) =>
                              setItemFormData((prev: CreateShoppingListItemInput) => ({ 
                                ...prev, 
                                category: value === 'other' ? null : value 
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="produce">🥬 Produce</SelectItem>
                              <SelectItem value="dairy">🥛 Dairy</SelectItem>
                              <SelectItem value="meat">🥩 Meat</SelectItem>
                              <SelectItem value="pantry">🥫 Pantry</SelectItem>
                              <SelectItem value="frozen">🧊 Frozen</SelectItem>
                              <SelectItem value="bakery">🥖 Bakery</SelectItem>
                              <SelectItem value="beverages">🥤 Beverages</SelectItem>
                              <SelectItem value="snacks">🍿 Snacks</SelectItem>
                              <SelectItem value="other">📦 Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Input
                            id="notes"
                            value={itemFormData.notes || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setItemFormData((prev: CreateShoppingListItemInput) => ({ 
                                ...prev, 
                                notes: e.target.value || null 
                              }))
                            }
                            placeholder="Brand preference, organic, etc..."
                          />
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isLoading || !itemFormData.name}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            {isLoading ? 'Adding...' : 'Add Item'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedShoppingList.items && selectedShoppingList.items.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupItemsByCategory(selectedShoppingList.items)).map(([category, items]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {items.filter(item => item.is_purchased).length}/{items.length} completed
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {items.map((item) => (
                            <Card 
                              key={item.id} 
                              className={`transition-all ${
                                item.is_purchased 
                                  ? 'bg-green-50 border-green-200 opacity-75' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={item.is_purchased}
                                    onCheckedChange={() => toggleItemPurchased(item)}
                                    className="data-[state=checked]:bg-green-500"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className={`font-medium ${item.is_purchased ? 'line-through text-gray-500' : ''}`}>
                                        {item.name}
                                      </span>
                                      {(item.quantity || item.unit) && (
                                        <span className="text-sm text-gray-600">
                                          {item.quantity} {item.unit}
                                        </span>
                                      )}
                                    </div>
                                    {item.notes && (
                                      <p className="text-sm text-gray-500 mt-1 italic">
                                        {item.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No items in this list yet</p>
                    <p className="text-sm text-gray-500">Add some items to get started!</p>
                  </div>
                )}
              </div>

              {selectedShoppingList.items && selectedShoppingList.items.length > 0 && (
                <div className="border-t pt-4">
                  {(() => {
                    const progress = calculateProgress(selectedShoppingList.items);
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Shopping Progress: {progress.purchased}/{progress.total} items
                        </span>
                        <Badge 
                          className={
                            progress.percentage === 100 
                              ? 'bg-green-500' 
                              : progress.percentage > 50 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }
                        >
                          {progress.percentage}% Complete
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
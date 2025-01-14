import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { FactoryRecipe, RecipeIngredient } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Table, Text } from '@mantine/core';

export const RecipeIngredientRow = ({
  index,
  type,
  recipe,
  ingredient,
  buildingsAmount,
  overclock,
  amplifiedRate,
}: {
  index: number;
  type: 'Ingredients' | 'Products';
  recipe: FactoryRecipe;
  ingredient: RecipeIngredient;
  buildingsAmount: number;
  overclock: number;
  amplifiedRate: number;
}) => {
  const item = AllFactoryItemsMap[ingredient.resource];
  const amountPerMinute =
    ((ingredient.displayAmount * 60) / recipe.time) * overclock;
  return (
    <Table.Tr>
      <Table.Td>
        <FactoryItemImage size={16} id={item.id} />
      </Table.Td>
      <Table.Td>
        <Text size="sm">{item.displayName}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fs="italic">
          <RepeatingNumber value={ingredient.displayAmount} />
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fs="italic">
          <RepeatingNumber value={amountPerMinute} />
          /min
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw="bold">
          <RepeatingNumber value={amountPerMinute * buildingsAmount} />
          /min
        </Text>
      </Table.Td>
      {amplifiedRate > 1 && (
        <Table.Td>
          {type === 'Products' && (
            <Text size="sm" fw="bold" c="grape.4">
              <RepeatingNumber
                value={amplifiedRate * amountPerMinute * buildingsAmount}
              />
              /min
            </Text>
          )}
        </Table.Td>
      )}
    </Table.Tr>
  );
};

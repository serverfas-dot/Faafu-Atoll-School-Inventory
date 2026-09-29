import { supabase } from './supabase';

export async function recalculateStockOnHand(itemId: string): Promise<boolean> {
  try {
    const { data: stockInData } = await supabase
      .from('stock_in')
      .select('stock_in')
      .eq('item_id', itemId);

    const { data: stockOutData } = await supabase
      .from('stock_out')
      .select('stock_out')
      .eq('item_id', itemId);

    const totalStockIn = stockInData?.reduce((sum, row) => sum + (row.stock_in || 0), 0) || 0;
    const totalStockOut = stockOutData?.reduce((sum, row) => sum + (row.stock_out || 0), 0) || 0;
    const calculatedStockOnHand = totalStockIn - totalStockOut;

    const { error } = await supabase
      .from('items')
      .update({ stock_on_hand: calculatedStockOnHand })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating stock on hand:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recalculating stock on hand:', error);
    return false;
  }
}

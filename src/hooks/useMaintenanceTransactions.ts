import { supabase } from "@/integrations/supabase/client";

interface MaintenanceLogData {
  id: string;
  entry_title: string;
  date_performed: string;
  parts_cost: number | null;
  labor_cost: number | null;
  other_cost: number | null;
  total_cost: number | null;
}

interface TransactionData {
  user_id: string;
  aircraft_id: string;
  title: string;
  transaction_date: string;
  amount: number;
  direction: "Debit";
  intent: "Maintenance";
  category: "Maintenance Labor" | "Maintenance Parts" | "Other";
  status: "Pending";
  source: "Maintenance";
  reference_id: string;
  reference_type: "Maintenance";
  include_in_cash_flow: boolean;
  include_in_ownership_total: boolean;
  include_in_cost_per_hour: boolean;
}

type TransactionCategory = "Maintenance Labor" | "Maintenance Parts" | "Other";

/**
 * Create transaction records from maintenance log cost data
 */
export const createMaintenanceTransactions = async (
  userId: string,
  aircraftId: string,
  log: MaintenanceLogData
): Promise<void> => {
  const transactions: Omit<TransactionData, "user_id" | "aircraft_id">[] = [];
  
  const hasLaborCost = log.labor_cost !== null && log.labor_cost > 0;
  const hasPartsCost = log.parts_cost !== null && log.parts_cost > 0;
  const hasOtherCost = log.other_cost !== null && log.other_cost > 0;
  const hasTotalCost = log.total_cost !== null && log.total_cost > 0;
  
  // Determine if this is itemized (has any individual cost breakdown) or just total
  const isItemized = hasLaborCost || hasPartsCost || hasOtherCost;
  
  if (!hasTotalCost) {
    // No cost data, nothing to create
    return;
  }
  
  if (!isItemized) {
    // Not itemized: create a single transaction for the total
    transactions.push({
      title: `${log.entry_title}:Maintenance`,
      transaction_date: log.date_performed,
      amount: log.total_cost!,
      direction: "Debit",
      intent: "Maintenance",
      category: "Other",
      status: "Pending",
      source: "Maintenance",
      reference_id: log.id,
      reference_type: "Maintenance",
      include_in_cash_flow: true,
      include_in_ownership_total: true,
      include_in_cost_per_hour: true,
    });
  } else {
    // Itemized: create individual transactions for each cost type
    if (hasLaborCost) {
      transactions.push({
        title: `${log.entry_title}:Labor`,
        transaction_date: log.date_performed,
        amount: log.labor_cost!,
        direction: "Debit",
        intent: "Maintenance",
        category: "Maintenance Labor",
        status: "Pending",
        source: "Maintenance",
        reference_id: log.id,
        reference_type: "Maintenance",
        include_in_cash_flow: true,
        include_in_ownership_total: true,
        include_in_cost_per_hour: true,
      });
    }
    
    if (hasPartsCost) {
      transactions.push({
        title: `${log.entry_title}:Parts`,
        transaction_date: log.date_performed,
        amount: log.parts_cost!,
        direction: "Debit",
        intent: "Maintenance",
        category: "Maintenance Parts",
        status: "Pending",
        source: "Maintenance",
        reference_id: log.id,
        reference_type: "Maintenance",
        include_in_cash_flow: true,
        include_in_ownership_total: true,
        include_in_cost_per_hour: true,
      });
    }
    
    if (hasOtherCost) {
      transactions.push({
        title: `${log.entry_title}:Other`,
        transaction_date: log.date_performed,
        amount: log.other_cost!,
        direction: "Debit",
        intent: "Maintenance",
        category: "Other",
        status: "Pending",
        source: "Maintenance",
        reference_id: log.id,
        reference_type: "Maintenance",
        include_in_cash_flow: true,
        include_in_ownership_total: true,
        include_in_cost_per_hour: true,
      });
    }
  }
  
  // Insert all transactions
  if (transactions.length > 0) {
    const transactionsToInsert = transactions.map(t => ({
      ...t,
      user_id: userId,
      aircraft_id: aircraftId,
    }));
    
    const { error } = await supabase
      .from("transactions")
      .insert(transactionsToInsert);
    
    if (error) {
      console.error("Error creating maintenance transactions:", error);
      throw error;
    }
  }
};

/**
 * Update transaction records when maintenance log is updated
 */
export const updateMaintenanceTransactions = async (
  userId: string,
  aircraftId: string,
  log: MaintenanceLogData
): Promise<void> => {
  // Fetch existing transactions for this maintenance log
  const { data: existingTransactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id, category")
    .eq("reference_id", log.id)
    .eq("reference_type", "Maintenance")
    .eq("user_id", userId)
    .neq("status", "Voided");
  
  if (fetchError) {
    console.error("Error fetching existing transactions:", fetchError);
    throw fetchError;
  }
  
  const hasLaborCost = log.labor_cost !== null && log.labor_cost > 0;
  const hasPartsCost = log.parts_cost !== null && log.parts_cost > 0;
  const hasOtherCost = log.other_cost !== null && log.other_cost > 0;
  const hasTotalCost = log.total_cost !== null && log.total_cost > 0;
  
  // Determine if this is itemized (has any individual cost breakdown) or just total
  const isItemized = hasLaborCost || hasPartsCost || hasOtherCost;
  
  // Build a map of what transactions we need
  const neededTransactions: Map<TransactionCategory, { amount: number; label: string }> = new Map();
  
  if (hasTotalCost) {
    if (!isItemized) {
      // Not itemized: single transaction for total
      neededTransactions.set("Other", { amount: log.total_cost!, label: "Maintenance" });
    } else {
      // Itemized: individual transactions
      if (hasLaborCost) neededTransactions.set("Maintenance Labor", { amount: log.labor_cost!, label: "Labor" });
      if (hasPartsCost) neededTransactions.set("Maintenance Parts", { amount: log.parts_cost!, label: "Parts" });
      if (hasOtherCost) neededTransactions.set("Other", { amount: log.other_cost!, label: "Other" });
    }
  }
  
  const existingByCategory = new Map<string, string>();
  for (const tx of existingTransactions || []) {
    existingByCategory.set(tx.category, tx.id);
  }
  
  // Update existing or create new transactions
  for (const [category, { amount, label }] of neededTransactions) {
    const existingId = existingByCategory.get(category);
    
    const transactionData = {
      title: `${log.entry_title}:${label}`,
      transaction_date: log.date_performed,
      amount,
      status: "Pending" as const,
    };
    
    if (existingId) {
      // Update existing transaction
      const { error } = await supabase
        .from("transactions")
        .update(transactionData)
        .eq("id", existingId);
      
      if (error) {
        console.error("Error updating transaction:", error);
        throw error;
      }
      existingByCategory.delete(category);
    } else {
      // Create new transaction
      const { error } = await supabase
        .from("transactions")
        .insert([{
          ...transactionData,
          user_id: userId,
          aircraft_id: aircraftId,
          direction: "Debit" as const,
          intent: "Maintenance" as const,
          category,
          source: "Maintenance" as const,
          reference_id: log.id,
          reference_type: "Maintenance" as const,
          include_in_cash_flow: true,
          include_in_ownership_total: true,
          include_in_cost_per_hour: true,
        }]);
      
      if (error) {
        console.error("Error creating transaction:", error);
        throw error;
      }
    }
  }
  
  // Void any transactions that are no longer needed
  for (const [category, id] of existingByCategory) {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "Voided" as const })
      .eq("id", id);
    
    if (error) {
      console.error("Error voiding transaction:", error);
      throw error;
    }
  }
};

/**
 * Void all transactions associated with a maintenance log when it's deleted
 */
export const voidMaintenanceTransactions = async (
  maintenanceLogId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from("transactions")
    .update({ status: "Voided" as const })
    .eq("reference_id", maintenanceLogId)
    .eq("reference_type", "Maintenance")
    .eq("user_id", userId)
    .neq("status", "Voided");
  
  if (error) {
    console.error("Error voiding maintenance transactions:", error);
    throw error;
  }
};

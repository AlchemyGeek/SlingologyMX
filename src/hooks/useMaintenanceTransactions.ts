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
 * Calculate the "other" cost as Total - Labor - Parts
 * If the user manually overrode Total, this captures the difference
 */
const calculateOtherCost = (
  total: number | null,
  labor: number | null,
  parts: number | null
): number => {
  if (total === null || total === 0) return 0;
  const laborVal = labor || 0;
  const partsVal = parts || 0;
  const calculated = total - laborVal - partsVal;
  return calculated > 0 ? calculated : 0;
};

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
  const hasTotalCost = log.total_cost !== null && log.total_cost > 0;
  
  // Calculate other cost as Total - Labor - Parts
  const otherCostValue = calculateOtherCost(log.total_cost, log.labor_cost, log.parts_cost);
  const hasOtherCost = otherCostValue > 0;
  
  // If only total cost is specified (no labor, no parts), create a single "Other" transaction
  if (hasTotalCost && !hasLaborCost && !hasPartsCost) {
    transactions.push({
      title: `${log.entry_title}:Other`,
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
    // Create individual transactions for each cost type
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
        amount: otherCostValue,
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
  const hasTotalCost = log.total_cost !== null && log.total_cost > 0;
  const otherCostValue = calculateOtherCost(log.total_cost, log.labor_cost, log.parts_cost);
  const hasOtherCost = otherCostValue > 0;
  
  // Build a map of what transactions we need
  const neededTransactions: Map<TransactionCategory, number> = new Map();
  
  // If only total cost is specified (no labor, no parts), we need a single "Other" transaction
  if (hasTotalCost && !hasLaborCost && !hasPartsCost) {
    neededTransactions.set("Other", log.total_cost!);
  } else {
    if (hasLaborCost) neededTransactions.set("Maintenance Labor", log.labor_cost!);
    if (hasPartsCost) neededTransactions.set("Maintenance Parts", log.parts_cost!);
    if (hasOtherCost) neededTransactions.set("Other", otherCostValue);
  }
  
  const existingByCategory = new Map<string, string>();
  for (const tx of existingTransactions || []) {
    existingByCategory.set(tx.category, tx.id);
  }
  
  // Update existing or create new transactions
  for (const [category, amount] of neededTransactions) {
    const existingId = existingByCategory.get(category);
    const categoryLabel = category === "Maintenance Labor" ? "Labor" : 
                         category === "Maintenance Parts" ? "Parts" : "Other";
    
    const transactionData = {
      title: `${log.entry_title}:${categoryLabel}`,
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

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import TransactionDetail from "./TransactionDetail";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { toast } from "sonner";
import { useUndoDelete } from "@/hooks/useUndoDelete";

interface TransactionsPanelProps {
  userId: string;
  aircraftId: string;
  onRecordChanged?: () => void;
  initialStatusFilter?: string;
  onClearStatusFilter?: () => void;
}

const TransactionsPanel = ({ userId, aircraftId, onRecordChanged, initialStatusFilter, onClearStatusFilter }: TransactionsPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency: userCurrency } = useUserCurrency(userId);

  const fetchTransactions = async () => {
    if (!aircraftId) return;
    
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [userId, aircraftId]);

  const handleTransactionCreated = () => {
    setShowForm(false);
    setEditingTransaction(null);
    fetchTransactions();
    onRecordChanged?.();
  };

  const handleEdit = (transaction: any) => {
    setSelectedTransaction(null);
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleSelect = (transaction: any) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDetail = () => {
    setSelectedTransaction(null);
  };

  const { deleteWithUndo } = useUndoDelete({
    tableName: "transactions",
    onAfterDelete: () => {
      setSelectedTransaction(null);
      fetchTransactions();
      onRecordChanged?.();
    },
    onAfterRestore: () => {
      fetchTransactions();
      onRecordChanged?.();
    },
  });

  const handleDelete = async (transactionId: string) => {
    const snapshot = transactions.find(t => t.id === transactionId);
    if (!snapshot) return;
    await deleteWithUndo(transactionId, snapshot);
  };

  // Show detail view
  if (selectedTransaction) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TransactionDetail
            transaction={selectedTransaction}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            userCurrency={userCurrency}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Transactions</CardTitle>
            <CardDescription>Track income and expenses for your aircraft</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">New Transaction</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <TransactionForm
            userId={userId}
            aircraftId={aircraftId}
            onSuccess={handleTransactionCreated}
            onCancel={handleCancelForm}
            editingTransaction={editingTransaction}
          />
        ) : (
          <TransactionList
            transactions={transactions}
            loading={loading}
            onUpdate={() => {
              fetchTransactions();
              onRecordChanged?.();
            }}
            onEdit={handleEdit}
            onSelect={handleSelect}
            userCurrency={userCurrency}
            initialStatusFilter={initialStatusFilter}
            onClearStatusFilter={onClearStatusFilter}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionsPanel;

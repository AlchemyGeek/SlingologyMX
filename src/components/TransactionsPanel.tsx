import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import TransactionDetail from "./TransactionDetail";
import { toast } from "sonner";

interface TransactionsPanelProps {
  userId: string;
  aircraftId: string;
  onRecordChanged?: () => void;
}

const TransactionsPanel = ({ userId, aircraftId, onRecordChanged }: TransactionsPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (transactionId: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
      if (error) throw error;
      toast.success("Transaction deleted");
      setSelectedTransaction(null);
      fetchTransactions();
      onRecordChanged?.();
    } catch (error: any) {
      toast.error("Failed to delete transaction");
    }
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
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
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
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionsPanel;

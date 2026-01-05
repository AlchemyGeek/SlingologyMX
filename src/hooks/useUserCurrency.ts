import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserCurrency = (userId: string | undefined) => {
  const [currency, setCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("currency")
          .eq("id", userId)
          .single();

        if (!error && data) {
          setCurrency((data as any).currency || "USD");
        }
      } catch (err) {
        console.error("Error fetching user currency:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrency();
  }, [userId]);

  return { currency, loading };
};

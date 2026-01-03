-- Add last_transaction_date to subscriptions for tracking
ALTER TABLE public.subscriptions ADD COLUMN last_transaction_date date;

-- Create the function to generate commitment transactions
CREATE OR REPLACE FUNCTION public.generate_commitment_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  months_diff integer;
  weeks_diff integer;
  is_due boolean;
  transactions_created integer := 0;
BEGIN
  FOR sub IN 
    SELECT s.*
    FROM public.subscriptions s
    WHERE s.recurrence != 'None'
      AND s.initial_date <= CURRENT_DATE
      AND (s.final_date IS NULL OR s.final_date >= CURRENT_DATE)
      AND (s.last_transaction_date IS NULL OR s.last_transaction_date < CURRENT_DATE)
  LOOP
    is_due := false;
    
    -- Calculate if today is a due date based on recurrence
    CASE sub.recurrence
      WHEN 'Weekly' THEN
        weeks_diff := (CURRENT_DATE - sub.initial_date) / 7;
        is_due := (CURRENT_DATE = sub.initial_date + (weeks_diff * 7));
        
      WHEN 'Bi-Monthly' THEN
        weeks_diff := (CURRENT_DATE - sub.initial_date) / 14;
        is_due := (CURRENT_DATE = sub.initial_date + (weeks_diff * 14));
        
      WHEN 'Monthly' THEN
        months_diff := (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM sub.initial_date)) * 12
                       + EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM sub.initial_date);
        is_due := months_diff >= 0
                  AND months_diff % 1 = 0
                  AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM sub.initial_date);
        
      WHEN 'Quarterly' THEN
        months_diff := (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM sub.initial_date)) * 12
                       + EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM sub.initial_date);
        is_due := months_diff >= 0
                  AND months_diff % 3 = 0
                  AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM sub.initial_date);
        
      WHEN 'Semi-Annual' THEN
        months_diff := (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM sub.initial_date)) * 12
                       + EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM sub.initial_date);
        is_due := months_diff >= 0
                  AND months_diff % 6 = 0
                  AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM sub.initial_date);
        
      WHEN 'Yearly' THEN
        months_diff := (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM sub.initial_date)) * 12
                       + EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM sub.initial_date);
        is_due := months_diff >= 0
                  AND months_diff % 12 = 0
                  AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM sub.initial_date);
    END CASE;
    
    IF is_due THEN
      -- Create the transaction
      INSERT INTO public.transactions (
        user_id,
        aircraft_id,
        title,
        transaction_date,
        amount,
        direction,
        intent,
        category,
        status,
        source,
        reference_id,
        reference_type,
        notes,
        generated_for_period
      ) VALUES (
        sub.user_id,
        sub.aircraft_id,
        sub.subscription_name,
        CURRENT_DATE,
        COALESCE(sub.cost, 0),
        'Debit',
        'Operation',
        CASE sub.type::text
          WHEN 'Insurance' THEN 'Insurance'
          WHEN 'Facilities & Storage' THEN 'Hangar / Tie-Down'
          WHEN 'Training, Proficiency & Safety' THEN 'Training'
          ELSE 'Other'
        END::transaction_category,
        'Pending',
        'Commitment',
        sub.id,
        'Commitment',
        sub.notes,
        TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      );
      
      -- Update the subscription's last_transaction_date
      UPDATE public.subscriptions 
      SET last_transaction_date = CURRENT_DATE
      WHERE id = sub.id;
      
      transactions_created := transactions_created + 1;
    END IF;
  END LOOP;
  
  RETURN transactions_created;
END;
$$;
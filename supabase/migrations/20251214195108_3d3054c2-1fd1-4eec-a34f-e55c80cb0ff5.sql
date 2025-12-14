-- Create access_codes table
CREATE TABLE public.access_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    code VARCHAR(5) NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(code)
);

-- Enable Row Level Security
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own access codes"
ON public.access_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own access codes"
ON public.access_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own access codes"
ON public.access_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own access codes"
ON public.access_codes
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access codes"
ON public.access_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any access codes"
ON public.access_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_access_codes_updated_at
BEFORE UPDATE ON public.access_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
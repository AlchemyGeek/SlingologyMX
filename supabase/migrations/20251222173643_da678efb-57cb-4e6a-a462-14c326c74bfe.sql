-- Create install_context enum for equipment
CREATE TYPE public.install_context AS ENUM ('Installed', 'Portable', 'Tool', 'Other');

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Required fields
  name VARCHAR NOT NULL,
  category public.directive_category NOT NULL,
  
  -- Optional Identity Fields
  manufacturer VARCHAR,
  model_or_part_number VARCHAR,
  serial_number VARCHAR,
  notes TEXT,
  
  -- Context & Classification
  install_context public.install_context,
  tags TEXT[] DEFAULT '{}',
  
  -- Lifecycle & Warranty
  purchase_date DATE,
  installed_date DATE,
  warranty_start_date DATE,
  warranty_expiration_date DATE,
  vendor VARCHAR,
  
  -- URLs with description (same structure as source_links in directives)
  links JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own equipment"
ON public.equipment
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own equipment"
ON public.equipment
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
ON public.equipment
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
ON public.equipment
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all equipment"
ON public.equipment
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any equipment"
ON public.equipment
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
-- Add display_name column to profiles table
ALTER TABLE public.profiles ADD COLUMN display_name character varying(50) NULL;

-- Update handle_new_user function to include display_name from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with 'Applied' status and capture metadata from signup
  INSERT INTO public.profiles (
    id, 
    email, 
    membership_status,
    name,
    display_name,
    country,
    state_prefecture,
    city,
    plane_registration,
    plane_model_make
  )
  VALUES (
    NEW.id, 
    NEW.email,
    'Applied',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'state_prefecture',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'plane_registration',
    NEW.raw_user_meta_data ->> 'plane_model_make'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- If email is stathis@gmail.com, also add admin role
  IF NEW.email = 'stathis@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;
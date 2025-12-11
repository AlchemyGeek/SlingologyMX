-- Update handle_new_user function to set membership_status to 'Applied' and capture profile fields from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile with 'Applied' status and capture metadata from signup
  INSERT INTO public.profiles (
    id, 
    email, 
    membership_status,
    name,
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
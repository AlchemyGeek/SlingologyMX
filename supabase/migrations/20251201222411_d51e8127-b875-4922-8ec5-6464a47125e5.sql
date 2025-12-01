-- Create feature_requests table
CREATE TABLE public.feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT title_length CHECK (char_length(title) <= 200),
    CONSTRAINT description_length CHECK (char_length(description) <= 2000)
);

-- Create feature_votes table to track individual votes
CREATE TABLE public.feature_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (feature_id, user_id) -- One vote per user per feature
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_requests
-- Everyone can view all feature requests
CREATE POLICY "Anyone can view feature requests"
ON public.feature_requests
FOR SELECT
USING (true);

-- Authenticated users can create feature requests
CREATE POLICY "Authenticated users can create feature requests"
ON public.feature_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own feature requests
CREATE POLICY "Users can update own feature requests"
ON public.feature_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own feature requests
CREATE POLICY "Users can delete own feature requests"
ON public.feature_requests
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for feature_votes
-- Everyone can view all votes
CREATE POLICY "Anyone can view votes"
ON public.feature_votes
FOR SELECT
USING (true);

-- Authenticated users can create votes
CREATE POLICY "Authenticated users can create votes"
ON public.feature_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON public.feature_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
ON public.feature_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update vote count on feature_requests
CREATE OR REPLACE FUNCTION public.update_feature_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the vote_count for the affected feature
    UPDATE public.feature_requests
    SET vote_count = (
        SELECT COALESCE(SUM(vote_type), 0)
        FROM public.feature_votes
        WHERE feature_id = COALESCE(NEW.feature_id, OLD.feature_id)
    )
    WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers to update vote count
CREATE TRIGGER update_vote_count_on_insert
AFTER INSERT ON public.feature_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_feature_vote_count();

CREATE TRIGGER update_vote_count_on_update
AFTER UPDATE ON public.feature_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_feature_vote_count();

CREATE TRIGGER update_vote_count_on_delete
AFTER DELETE ON public.feature_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_feature_vote_count();

-- Trigger for updating updated_at on feature_requests
CREATE TRIGGER update_feature_requests_updated_at
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
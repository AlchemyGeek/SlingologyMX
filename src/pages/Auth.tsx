import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import slingologyIcon from "@/assets/slingology-icon.png";

type AuthView = "choice" | "login" | "signup" | "forgot-password" | "reset-password";

const Auth = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [checkingSignup, setCheckingSignup] = useState(true);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Signup profile fields
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [statePrefecture, setStatePrefecture] = useState("");
  const [city, setCity] = useState("");
  const [planeRegistration, setPlaneRegistration] = useState("");
  const [planeModelMake, setPlaneModelMake] = useState("");

  useEffect(() => {
    // Check if signups are enabled
    const checkSignupEnabled = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "signup_enabled")
          .single();

        if (!error && data) {
          setSignupEnabled(data.setting_value === "true");
        }
      } catch (error) {
        console.error("Error checking signup setting:", error);
      } finally {
        setCheckingSignup(false);
      }
    };

    checkSignupEnabled();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password reset link - set flag and show reset view
        setIsPasswordRecovery(true);
        setView("reset-password");
        return;
      }
      // Don't redirect if we're in password recovery mode
      if (session && event !== 'SIGNED_OUT' && !isPasswordRecovery) {
        // Check if user status is Applied and needs to be updated to Approved
        handleFirstLoginApproval(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check URL for recovery token to detect password recovery on initial load
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        setIsPasswordRecovery(true);
        setView("reset-password");
        return;
      }
      
      if (session && !isPasswordRecovery) {
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (user && !error) {
            handleFirstLoginApproval(user.id);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFirstLoginApproval = async (userId: string) => {
    try {
      // Check current membership status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // If status is Applied, update to Approved (email was confirmed by clicking link)
      if (profile?.membership_status === 'Applied') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ membership_status: 'Approved' })
          .eq('id', userId);

        if (updateError) throw updateError;
        toast.success("Your account has been approved!");
      }

      sessionStorage.removeItem("disclaimer_acknowledged");
      navigate("/disclaimer");
    } catch (error: any) {
      console.error("Error checking/updating status:", error);
      sessionStorage.removeItem("disclaimer_acknowledged");
      navigate("/disclaimer");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Logged in successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!planeRegistration.trim()) {
      toast.error("Plane Registration is required");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            name: name.trim(),
            country: country.trim() || null,
            state_prefecture: statePrefecture.trim() || null,
            city: city.trim() || null,
            plane_registration: planeRegistration.trim(),
            plane_model_make: planeModelMake.trim() || null,
          },
        },
      });
      if (error) throw error;
      
      // Check if user already exists (Supabase returns empty identities array for existing users)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("An account with this email already exists. Please log in instead.");
        setLoading(false);
        return;
      }
      setSentEmail(email);
      setEmailSent(true);
      toast.success("Verification email sent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setCountry("");
    setStatePrefecture("");
    setCity("");
    setPlaneRegistration("");
    setPlaneModelMake("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setSentEmail(email);
      setResetEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      // Sign out after password reset so user can log in with new password
      await supabase.auth.signOut();
      setIsPasswordRecovery(false);
      toast.success("Password updated successfully! Please log in with your new password.");
      resetForm();
      setView("login");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Choice view - Sign Up or Log In
  if (view === "choice" && !emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-20 w-20" />
            </div>
            <CardTitle className="text-2xl">SlingologyMX</CardTitle>
            <CardDescription>
              Aircraft Maintenance Tracker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full h-12 text-lg" 
              onClick={() => setView("signup")}
              disabled={!signupEnabled || checkingSignup}
            >
              Sign Up
            </Button>
            {!checkingSignup && !signupEnabled && (
              <p className="text-sm text-muted-foreground text-center">
                New user signups are currently unavailable. Please check back later.
              </p>
            )}
            <Button 
              variant="outline" 
              className="w-full h-12 text-lg"
              onClick={() => setView("login")}
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email sent confirmation
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-foreground">
                  A verification email has been sent to <strong>{sentEmail}</strong>
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Please check your inbox and click the link to verify your account and complete registration.
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                Your account will be activated once you verify your email.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  resetForm();
                  setView("login");
                }}
                className="mt-4"
              >
                Back to Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login view
  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl">Log In</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Log In"}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("forgot-password");
                }}
                className="text-primary hover:underline text-sm block w-full"
              >
                Forgot your password?
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("choice");
                }}
                className="text-muted-foreground hover:underline text-sm"
              >
                ← Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password sent confirmation
  if (resetEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-foreground">
                  A password reset link has been sent to <strong>{sentEmail}</strong>
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Please check your inbox and click the link to reset your password.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setResetEmailSent(false);
                  resetForm();
                  setView("login");
                }}
                className="mt-4"
              >
                Back to Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password view
  if (view === "forgot-password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("login");
                }}
                className="text-muted-foreground hover:underline text-sm"
              >
                ← Back to Log In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password view (after clicking email link)
  if (view === "reset-password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup view with profile fields
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <img src={slingologyIcon} alt="SlingologyMX" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Account Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password <span className="text-destructive">*</span></Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Location</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State / Prefecture</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="State"
                    value={statePrefecture}
                    onChange={(e) => setStatePrefecture(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Aircraft Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Aircraft Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plane-reg">Plane Registration <span className="text-destructive">*</span></Label>
                  <Input
                    id="plane-reg"
                    type="text"
                    placeholder="N12345"
                    value={planeRegistration}
                    onChange={(e) => setPlaneRegistration(e.target.value)}
                    maxLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plane-model">Plane Model & Make</Label>
                  <Input
                    id="plane-model"
                    type="text"
                    placeholder="e.g. Sling TSi"
                    value={planeModelMake}
                    onChange={(e) => setPlaneModelMake(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setView("choice");
              }}
              className="text-primary hover:underline text-sm"
            >
              ← Back
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft, Save, BookOpen, User as UserIcon, Bug, Lightbulb, Users } from "lucide-react";
import { toast } from "sonner";
import slingologyIcon from "@/assets/slingology-icon.png";
import UserManagement from "@/components/UserManagement";

interface ProfileData {
  name: string;
  email: string;
  country: string;
  state_prefecture: string;
  city: string;
  plane_registration: string;
  plane_model_make: string;
}

interface ProfileCardProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
  handleSave: () => Promise<void>;
  saving: boolean;
}

const ProfileCard = ({ profileData, setProfileData, handleSave, saving }: ProfileCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>User Profile</CardTitle>
      <CardDescription>Manage your personal information and aircraft details</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={profileData.name}
          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
          maxLength={50}
          placeholder="Enter your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profileData.email} disabled className="bg-muted cursor-not-allowed" />
        <p className="text-xs text-muted-foreground">Email cannot be changed at this time</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Location</h3>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={profileData.country}
            onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
            maxLength={100}
            placeholder="Enter country"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State/Prefecture</Label>
          <Input
            id="state"
            value={profileData.state_prefecture}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                state_prefecture: e.target.value,
              })
            }
            maxLength={100}
            placeholder="Enter state or prefecture"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={profileData.city}
            onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
            maxLength={100}
            placeholder="Enter city"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Aircraft Information</h3>
        <div className="space-y-2">
          <Label htmlFor="registration">Plane Registration Number</Label>
          <Input
            id="registration"
            value={profileData.plane_registration}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                plane_registration: e.target.value,
              })
            }
            maxLength={8}
            placeholder="Enter registration number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Plane Model and Make</Label>
          <Input
            id="model"
            value={profileData.plane_model_make}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                plane_model_make: e.target.value,
              })
            }
            maxLength={50}
            placeholder="Enter plane model and make"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Profile"}
      </Button>

      <div className="pt-6 border-t space-y-2">
        <h3 className="font-semibold text-sm">Disclaimer</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This is a personal project, built and maintained with care. We'll keep improving the features and do our
          best to safeguard your data. That said, there are no guarantees about uptime, availability, or
          uninterrupted operation. Your paper logbooks and your own digitized scans should always remain your
          primary source of truth. Please make sure you keep your own backups—use the Export option in your
          profile to save your data at any time. If the service ever needs to be discontinued, we'll make every
          effort to give you enough notice to download your information. By using this site, you acknowledge that
          you do so at your own risk.
        </p>
      </div>
    </CardContent>
  </Card>
);

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    country: "",
    state_prefecture: "",
    city: "",
    plane_registration: "",
    plane_model_make: "",
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setProfileData({
        name: data.name || "",
        email: data.email || user.email || "",
        country: data.country || "",
        state_prefecture: data.state_prefecture || "",
        city: data.city || "",
        plane_registration: data.plane_registration || "",
        plane_model_make: data.plane_model_make || "",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profileData.name,
        country: profileData.country,
        state_prefecture: profileData.state_prefecture,
        city: profileData.city,
        plane_registration: profileData.plane_registration,
        plane_model_make: profileData.plane_model_make,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to save profile");
      console.error("Error saving profile:", error);
      return;
    }

    toast.success("Profile saved successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <img src={slingologyIcon} alt="SlingologyMX" className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Profile</h1>
              <span className="text-sm text-muted-foreground">({isAdmin ? "Admin" : "Regular Member"})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  "https://slingology.blog/category/mx/?utm_campaign=slingologymx&utm_source=service&utm_medium=menu",
                  "_blank",
                )
              }
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Blog
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/bug-reports")}>
              <Bug className="h-4 w-4 mr-2" />
              Bug Reports
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/feature-requests")}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Feature Requests
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {isAdmin ? (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <ProfileCard
                profileData={profileData}
                setProfileData={setProfileData}
                handleSave={handleSave}
                saving={saving}
              />
            </TabsContent>
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <ProfileCard
            profileData={profileData}
            setProfileData={setProfileData}
            handleSave={handleSave}
            saving={saving}
          />
        )}
      </main>
    </div>
  );
};

export default Profile;

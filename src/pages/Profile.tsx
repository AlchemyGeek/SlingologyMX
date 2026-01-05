import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft, Save, User as UserIcon, Users, Plane } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import slingologyIcon from "@/assets/slingology-icon.png";
import UserManagement from "@/components/UserManagement";
import { AircraftManagement } from "@/components/AircraftManagement";

interface ProfileData {
  name: string;
  display_name: string;
  email: string;
  country: string;
  state_prefecture: string;
  city: string;
  currency: string;
  timezone: string;
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
      <CardDescription>Manage your personal information</CardDescription>
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
        <Label htmlFor="display_name">Display Name (Alias)</Label>
        <Input
          id="display_name"
          value={profileData.display_name}
          onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
          maxLength={50}
          placeholder="Enter a public display name"
        />
        <p className="text-xs text-muted-foreground">This name will be shown publicly instead of your real name</p>
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

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={profileData.currency}
            onValueChange={(value) => setProfileData({ ...profileData, currency: value })}
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {/* Americas */}
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
              {/* Europe */}
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
              <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
              <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
              <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
              <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
              <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
              <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
              <SelectItem value="RON">RON - Romanian Leu</SelectItem>
              <SelectItem value="ISK">ISK - Icelandic Króna</SelectItem>
              {/* Asia-Pacific */}
              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
              <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
              {/* Africa */}
              <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
              <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
              <SelectItem value="MAD">MAD - Moroccan Dirham</SelectItem>
              {/* Middle East / Arabic */}
              <SelectItem value="AED">AED - UAE Dirham</SelectItem>
              <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
              <SelectItem value="QAR">QAR - Qatari Riyal</SelectItem>
              <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
              <SelectItem value="BHD">BHD - Bahraini Dinar</SelectItem>
              <SelectItem value="OMR">OMR - Omani Rial</SelectItem>
              <SelectItem value="JOD">JOD - Jordanian Dinar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={profileData.timezone}
            onValueChange={(value) => setProfileData({ ...profileData, timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
              <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
              <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
              <SelectItem value="America/Anchorage">Alaska Time (AKST/AKDT)</SelectItem>
              <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
              <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
              <SelectItem value="Europe/Paris">Central European (CET/CEST)</SelectItem>
              <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
              <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
            </SelectContent>
          </Select>
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
    display_name: "",
    email: "",
    country: "",
    state_prefecture: "",
    city: "",
    currency: "USD",
    timezone: "America/Los_Angeles",
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
        display_name: (data as any).display_name || "",
        email: data.email || user.email || "",
        country: data.country || "",
        state_prefecture: data.state_prefecture || "",
        city: data.city || "",
        currency: (data as any).currency || "USD",
        timezone: (data as any).timezone || "America/Los_Angeles",
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
        display_name: profileData.display_name,
        country: profileData.country,
        state_prefecture: profileData.state_prefecture,
        city: profileData.city,
        currency: profileData.currency,
        timezone: profileData.timezone,
      } as any)
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

  const renderProfileContent = () => (
    <div className="space-y-6">
      <ProfileCard
        profileData={profileData}
        setProfileData={setProfileData}
        handleSave={handleSave}
        saving={saving}
      />
      <AircraftManagement userId={user.id} />
    </div>
  );

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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin ? (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="aircraft" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Aircraft
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="max-w-2xl">
              <ProfileCard
                profileData={profileData}
                setProfileData={setProfileData}
                handleSave={handleSave}
                saving={saving}
              />
            </TabsContent>
            <TabsContent value="aircraft" className="max-w-2xl">
              <AircraftManagement userId={user.id} />
            </TabsContent>
            <TabsContent value="users" className="max-w-4xl">
              <UserManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="aircraft" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Aircraft
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="max-w-2xl">
              <ProfileCard
                profileData={profileData}
                setProfileData={setProfileData}
                handleSave={handleSave}
                saving={saving}
              />
            </TabsContent>
            <TabsContent value="aircraft" className="max-w-2xl">
              <AircraftManagement userId={user.id} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Profile;

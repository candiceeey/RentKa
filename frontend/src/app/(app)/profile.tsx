import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { Screen } from '@/components/ui/screen';
import { VerifyNotice } from '@/components/verify-notice';
import { useAuth } from '@/context/auth';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const ratings = profile?.ratingCount ?? 0;
  const trust =
    ratings > 0 && profile?.trustScore != null ? `${profile.trustScore.toFixed(2)} (${ratings})` : 'No ratings yet';

  return (
    <Screen inTabs header={<AppHeader />}>
      <ThemedText type="heading">Profile</ThemedText>

      <Card>
        <DetailRow label="Full Name" value={profile?.fullName ?? '-'} />
        <DetailRow label="Email" value={profile?.email ?? user?.email ?? '-'} />
        <DetailRow label="Mobile Number" value={profile?.contact ?? '-'} />
        <DetailRow label="Trust Score" value={trust} />
        <DetailRow label="ID Verification" last>
          <Badge label={profile?.verified ? 'Verified' : 'Not verified'} tone={profile?.verified ? 'success' : 'warning'} />
        </DetailRow>
      </Card>

      <VerifyNotice />

      <Button title="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}

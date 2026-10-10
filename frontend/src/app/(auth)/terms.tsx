import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { FormTitle } from '@/components/ui/form-title';
import { Screen } from '@/components/ui/screen';

// PLACEHOLDER: replace with the team's final Terms and Conditions text before release.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'About RentKa',
    body: 'RentKa connects people in Butuan City who want to rent items with people who lend them. RentKa is not a party to any rental.',
  },
  {
    title: 'Your account',
    body: 'You must be at least 18 years old and give your real name. Your ID is checked once on sign-up. Your ID number and birthdate are not stored.',
  },
  {
    title: 'Rentals and payments',
    body: 'Deposits and rental payments are made outside the app, between the lender and the borrower. RentKa only records amounts and statuses.',
  },
  {
    title: 'Your responsibilities',
    body: 'Lenders must describe items honestly. Borrowers must return items on time and in the same condition.',
  },
];

export default function TermsScreen() {
  return (
    <Screen>
      <BackButton />
      <FormTitle title="Terms and Conditions" />
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <ThemedText type="bodyBold">{section.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {section.body}
          </ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

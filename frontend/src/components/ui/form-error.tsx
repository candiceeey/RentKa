import { ThemedText } from '@/components/themed-text';

/** Red message under a form for errors that are not tied to one field. Renders nothing when empty. */
export function FormError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <ThemedText type="small" themeColor="danger">
      {message}
    </ThemedText>
  );
}

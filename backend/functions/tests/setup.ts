// Test-only values. The real secrets live in Firebase Secret Manager and are never in the repo.
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-rentka';
process.env.ID_HMAC_SECRET = 'test-only-hmac-secret';
process.env.GMAIL_APP_PASSWORD = 'test-only-password';

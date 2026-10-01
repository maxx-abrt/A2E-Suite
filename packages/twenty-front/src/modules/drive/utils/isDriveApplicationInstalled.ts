// Mirrors a2e-drive/src/application.config.ts (committed forever there, and the
// value also appears in A2eSuiteApplicationUniversalIdentifiers). Kept local
// because that constants file allows a single const per file.
export const A2E_DRIVE_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11cd01f-75de-4acd-8e67-0e9c484fde02';

// The a2e-drive app owns the `driveFolder` object and the attachment folder
// field; the host Archive landing can only list folder-structure templates once
// the app's metadata is installed, so it is gated on this identifier rather than
// probing object metadata (which can resolve while an install is mid-flight).
export const isDriveApplicationInstalled = (
  installedApplicationUniversalIdentifiers: string[],
): boolean =>
  installedApplicationUniversalIdentifiers.includes(
    A2E_DRIVE_APPLICATION_UNIVERSAL_IDENTIFIER,
  );

import { registerEnumType } from '@nestjs/graphql';

export enum ApplicationRegistrationSourceType {
  NPM = 'npm',
  TARBALL = 'tarball',
  LOCAL = 'local',
  OAUTH_ONLY = 'oauth-only',
  // Apps bundled into the Docker image at build time; installed globally on
  // all workspaces by the `app:provision-bundled` startup command (M1).
  // The tarball lives on the server filesystem at `bundledAppSourcePath`.
  BUNDLED = 'bundled',
}

registerEnumType(ApplicationRegistrationSourceType, {
  name: 'ApplicationRegistrationSourceType',
});

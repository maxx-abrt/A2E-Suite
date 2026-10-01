// Docs-generation shim for `libphonenumber-js`.
//
// The catalogue generator runs under tsx, which transpiles the built
// `twenty-shared` CJS output. In that interop path `libphonenumber-js`'s
// metadata import resolves to `{ default }`, so importing `twenty-shared/utils`
// (transitively, through the Syna recipe descriptors) throws before any
// descriptor is read. The library is a browser concern the docs never use, so
// the generator tsconfig maps it to this stub: `getCountries` returns an empty
// list, which is all `twenty-shared/utils` touches at module load. Do not import
// this from application code.

export const getCountries = (): string[] => [];

export const getCountryCallingCode = (_country: string): string => '';

export const parsePhoneNumber = (value: string) => value;

export const parsePhoneNumberFromString = (value: string) => value;

export const isPossiblePhoneNumber = (_value: string): boolean => false;

export const isValidPhoneNumber = (_value: string): boolean => false;

/**
 * MiPhi Sales: app configuration.
 *
 * 1. AZURE_CLIENT_ID: the "Application (client) ID" of the app registration
 *    created in Microsoft Entra ID (see SETUP.md, step 1). It can also be
 *    supplied at build time with the EXPO_PUBLIC_AZURE_CLIENT_ID variable.
 * 2. TENANT: the company's Microsoft 365 tenant (domain or tenant ID).
 * 3. LIBRARY: the OneDrive/SharePoint sharing links shown as tabs in the app.
 *    Each link can point at a folder (everything inside it is listed live,
 *    including sub-folders) or at a single file.
 */

export const AZURE_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || '00000000-0000-0000-0000-000000000000';

export const TENANT: string = process.env.EXPO_PUBLIC_AZURE_TENANT || 'miphi.in';

/** Custom URL scheme; the redirect URI to register in Entra ID is `miphisales://auth`. */
export const APP_SCHEME = 'miphisales';

/** Read-only Microsoft Graph permissions. The app never requests write access. */
export const GRAPH_SCOPES = ['openid', 'profile', 'offline_access', 'User.Read', 'Files.Read.All'];

export type SectionKey = 'brochures' | 'avl' | 'decks';

export type LibrarySection = {
  key: SectionKey;
  title: string;
  subtitle: string;
  shareUrl: string;
};

export const LIBRARY: Record<SectionKey, LibrarySection> = {
  brochures: {
    key: 'brochures',
    title: 'Brochures',
    subtitle: 'Product brochures and datasheets',
    shareUrl:
      'https://micromaxinfo-my.sharepoint.com/:f:/g/personal/muniyappan_kaliyappan_miphi_in/IgDibevvUPaySILopGwjE4mdARpSgB7BOz5jfMEqcGZ4p5s?e=tc0PTN',
  },
  avl: {
    key: 'avl',
    title: 'AVL',
    subtitle: 'Approved vendor lists',
    shareUrl:
      'https://micromaxinfo-my.sharepoint.com/:f:/g/personal/muniyappan_kaliyappan_miphi_in/IgA7dosWm_CWR5cJT8R7UVePAXFECOXNrCqWiNpLdMptgjs?e=Na4nnZ',
  },
  decks: {
    key: 'decks',
    title: 'Decks',
    subtitle: 'Presentation decks',
    // Currently a single file link. Replace with a folder link so new decks appear automatically.
    shareUrl:
      'https://micromaxinfo-my.sharepoint.com/:b:/g/personal/muniyappan_kaliyappan_miphi_in/IQBNYbjU4CxERIzy0wusL1fsAa_v_uJ_uMUPoiGVGLEc2Ew?e=7nMMhh',
  },
};

/** Files created within this many days get a "NEW" badge. */
export const NEW_BADGE_DAYS = 14;

export const isConfigured = () =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(AZURE_CLIENT_ID) && !/^0{8}-/.test(AZURE_CLIENT_ID);

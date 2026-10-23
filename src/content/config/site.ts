export const siteConfig = {
  name: 'Damas Technologies',
  contactEmail: 'hi@damastechnologies.com',
  websiteUrl: 'https://linktranscriber.com',
  websiteDomain: 'linktranscriber.com',
  privacyPolicyUrl: 'https://linktranscriber.com/privacy-policy.html',
  termsOfUseUrl: 'https://linktranscriber.com/terms-of-use.html',
} as const;

export const legalPages = [
  { href: '/terms-of-use.html', label: 'Terms of Use' },
  { href: '/privacy-policy.html', label: 'Privacy Policy' },
  { href: '/support.html', label: 'Support' },
] as const;

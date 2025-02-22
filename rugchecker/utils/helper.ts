import MetadataCheckResult from '../model/result/metadata-check';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to check if a string is a valid URL
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
  } catch (_) {
    return false;
  }
  return true;
}

// Helper function to check if social media links exist
export function check_token_social_links(metadata: MetadataCheckResult): boolean {
  try {
    const socialLinks = {
      twitter: metadata.twitter || 'undefined',
      website: metadata.website || 'undefined',
      telegram: metadata.telegram || 'undefined',
    };

    if (Object.values(socialLinks).every(link => link === 'undefined')) {
      console.log("No social media links found.");
      return false;
    } else {
      console.log("Social media links found.");
      return true;
    }
  } catch (_) {
    return false;
  }
}
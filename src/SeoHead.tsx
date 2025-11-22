import React, { useEffect } from 'react';
import { Translation, LangCode } from './locales';

interface SeoHeadProps {
  t: Translation;
  lang: LangCode;
}

const SeoHead: React.FC<SeoHeadProps> = ({ t, lang }) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = t.seoTitle;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', t.seoDesc);
    
    // 3. Update Open Graph & Twitter
    const updateMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (tag) tag.setAttribute('content', content);
    };

    updateMeta('og:title', t.seoTitle);
    updateMeta('og:description', t.seoDesc);
    updateMeta('twitter:title', t.seoTitle);
    updateMeta('twitter:description', t.seoDesc);

    // 4. Update Canonical to Current URL
    // While index.html points to root, dynamic pages should point to themselves
    // to avoid "duplicate content" flags for the translated versions.
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    const currentPath = window.location.pathname === '/' ? '' : window.location.pathname;
    // Remove trailing slash if not root for consistency
    const cleanPath = currentPath.endsWith('/') && currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath;
    const canonicalUrl = `https://bestimageeditor.online${cleanPath}`;

    if (linkCanonical) {
        linkCanonical.setAttribute('href', canonicalUrl);
    } else {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        linkCanonical.setAttribute('href', canonicalUrl);
        document.head.appendChild(linkCanonical);
    }
    
    updateMeta('og:url', canonicalUrl);
    updateMeta('twitter:url', canonicalUrl);

    // 5. Update HTML Attributes
    // Map 'vn' to 'vi' for ISO compliance
    const isoLang = lang === 'vn' ? 'vi' : lang;
    document.documentElement.lang = isoLang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  }, [t, lang]);

  return null;
};

export default SeoHead;
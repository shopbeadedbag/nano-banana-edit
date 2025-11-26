import React, { useEffect } from 'react';

const SeoHead: React.FC = () => {
  useEffect(() => {
    const title = "Nano Banana - Free AI Image Editor | Edit Photos with Text Prompts";
    const description = "Edit photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Upload any picture, describe your changes, and let Nano Banana transform your images in seconds.";
    const url = "https://bestimageeditor.online/";

    // 1. Update Document Title
    document.title = title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
    
    // 3. Update Open Graph & Twitter
    const updateMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (tag) tag.setAttribute('content', content);
    };

    updateMeta('og:title', title);
    updateMeta('og:description', description);
    updateMeta('og:url', url);
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:url', url);

    // 4. Update Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (linkCanonical) {
        linkCanonical.setAttribute('href', url);
    } else {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        linkCanonical.setAttribute('href', url);
        document.head.appendChild(linkCanonical);
    }

    // 5. Attributes
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';

  }, []);

  return null;
};

export default SeoHead;
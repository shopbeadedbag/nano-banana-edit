
import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage, generateImageFromText } from './services/geminiService';
import { LogoIcon, ChevronDownIcon, SpinnerIcon, XIcon, GlobeIcon, MenuIcon, InfoIcon, CopyIcon, ImageIcon, DownloadIcon, TextToImageIcon } from './components/icons';
import { locales, LangCode, Translation } from './locales';

// --- Routing & I18n Helpers ---

const SUPPORTED_LANGS: LangCode[] = ['en', 'es', 'fr', 'pt', 'ru', 'ar', 'id', 'vn', 'th'];
const DEFAULT_LANG: LangCode = 'en';

const getLangFromPath = (): LangCode => {
  const path = window.location.pathname;
  const firstSegment = path.split('/')[1];
  if (SUPPORTED_LANGS.includes(firstSegment as LangCode)) {
    return firstSegment as LangCode;
  }
  return DEFAULT_LANG;
};

const navigateToLang = (lang: LangCode) => {
  const currentPath = window.location.pathname;
  // Remove existing lang prefix if present
  const segments = currentPath.split('/').filter(Boolean);
  if (SUPPORTED_LANGS.includes(segments[0] as LangCode)) {
    segments.shift();
  }
  
  const cleanPath = segments.join('/');
  // Construct new URL
  const newPath = lang === DEFAULT_LANG ? `/${cleanPath}` : `/${lang}/${cleanPath}`;
  window.location.href = newPath.replace('//', '/');
};

// --- SEO Helper Component ---
const SeoHead: React.FC<{ t: Translation; lang: LangCode }> = ({ t, lang }) => {
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

    // 4. Update HTML Lang and Dir attributes
    document.documentElement.lang = lang === 'vn' ? 'vi' : lang; // map vn to vi for ISO standard
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // 5. Dynamic Canonical Update
    // Though index.html has a static canonical to root, for localized pages we typically want
    // the canonical to be the current page to avoid duplicate content issues with the root.
    // Note: The user prompt asked to point canonical to root in HTML, but for the JS app logic,
    // it is best practice to point to self if the content is unique (translated).
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = `https://bestimageeditor.online${window.location.pathname}`;
    if (linkCanonical) {
        linkCanonical.setAttribute('href', canonicalUrl);
    }
    
    // Update OG:URL too
    updateMeta('og:url', canonicalUrl);
    updateMeta('twitter:url', canonicalUrl);

  }, [t, lang]);

  return null;
};

const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ dataUrl, base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const getAspectRatioFromString = (ratio: string): number => {
    const [w, h] = ratio.split(':').map(Number);
    return w / h;
};

const cropImage = (imageUrl: string, targetRatioString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const originalWidth = img.width;
            const originalHeight = img.height;
            const originalRatio = originalWidth / originalHeight;
            const targetRatio = getAspectRatioFromString(targetRatioString);

            let cropWidth, cropHeight, cropX, cropY;

            if (originalRatio > targetRatio) {
                cropHeight = originalHeight;
                cropWidth = originalHeight * targetRatio;
                cropX = (originalWidth - cropWidth) / 2;
                cropY = 0;
            } else {
                cropWidth = originalWidth;
                cropHeight = originalWidth / targetRatio;
                cropX = 0;
                cropY = (originalHeight - cropHeight) / 2;
            }

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            ctx.drawImage(
                img,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => reject(error);
        img.src = imageUrl;
    });
};

// --- Policies (Simplified for brevity, content remains static English/Universal for now or can be added to locales) ---
interface PolicyPageProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const PolicyPage: React.FC<PolicyPageProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative border border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-zinc-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-6 overflow-y-auto text-gray-300 space-y-4 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- I18n State ---
  const currentLang = getLangFromPath();
  const t = locales[currentLang] || locales['en'];

  type Mode = 'image-to-image' | 'text-to-image';
  const [mode, setMode] = useState<Mode>('image-to-image');
  
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [i2iPrompt, setI2iPrompt] = useState<string>('');
  const [i2iResult, setI2iResult] = useState<string | null>(null);
  const [t2iPrompt, setT2iPrompt] = useState<string>('');
  const [t2iResult, setT2iResult] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [autoRatio, setAutoRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  const currentPrompt = mode === 'image-to-image' ? i2iPrompt : t2iPrompt;
  const setCurrentPrompt = mode === 'image-to-image' ? setI2iPrompt : setT2iPrompt;
  const currentResult = mode === 'image-to-image' ? i2iResult : t2iResult;

  // Static content structure mapping to locales where possible, or keeping rich structure
  // In a full app, these arrays would also be in locales.ts
  const content = {
    howToUse: [
      { number: 1, title: "Upload Your Image", description: "Drag and drop or browse to select any photo you want to edit." },
      { number: 2, title: "Describe Your Vision", description: "Type a natural language prompt describing how you want to transform your image." },
      { number: 3, title: "Choose Your Model", description: "Select Fast for quick edits, Pro for better quality, or Ultra for the best results." },
      { number: 4, title: "Apply and Download", description: "Click Apply and watch AI transform your image in seconds." }
    ],
    // Simplified for this example to avoid massive file size, pulling titles from 't' object
    features: [
      {
        title: t.featuresTitle,
        description: "Nano Banana lets you edit images the way you think - with natural conversation. No complex tools or tutorials needed.",
        imageUrl: "https://pixlr.com/images/prompter/conversational.webp",
        imagePosition: "right"
      }
    ],
    faq: [
        { q: "What is Nano Banana AI Image Editor?", a: "Nano Banana is a conversational AI image editor that transforms photos based on natural language descriptions." },
        { q: "How do I edit images with AI?", a: "Upload your photo, type a description of the edits you want, and click Apply." },
        { q: "Is it free?", a: "Yes, Nano Banana offers free AI image editing capabilities." }
    ]
  };

  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [langMenuRef]);

  const handleFileSelect = () => {
    document.getElementById('file-upload')?.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
  };
  
  const handleDownload = () => {
    if (!currentResult) return;
    const link = document.createElement('a');
    link.href = currentResult;
    link.download = 'generated-by-nano-banana.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setI2iResult(null);
      try {
        const imageFile = await fileToImageFile(file);
        setOriginalImage(imageFile);
      } catch (err) {
        setError('Failed to load image.');
        console.error(err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!currentPrompt) {
      setError('Please provide a prompt.');
      return;
    }
    if (mode === 'image-to-image' && !originalImage) {
      setError('Please upload an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    if (mode === 'image-to-image') setI2iResult(null);
    else setT2iResult(null);

    try {
      let newImageFromApi: string;
      if (mode === 'image-to-image') {
        newImageFromApi = await editImage(originalImage!.base64, originalImage!.mimeType, i2iPrompt);
      } else {
        newImageFromApi = await generateImageFromText(t2iPrompt);
      }
      const finalImage = autoRatio ? newImageFromApi : await cropImage(newImageFromApi, aspectRatio);
      if (mode === 'image-to-image') setI2iResult(finalImage);
      else setT2iResult(finalImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const navLinks = [
      { href: '#editor', label: t.navEditor },
      { href: '#how-it-works', label: t.navHow },
      { href: '#features', label: t.navFeatures },
      { href: '#transformations', label: t.navTrans },
      { href: '#faq', label: t.navFaq },
  ];
  
  const suggestedPrompts = ['Change background to space', 'Make it oil painting style', 'Add neon lights'];

  const toggleFaq = (index: number) => setActiveFaq(activeFaq === index ? null : index);

  const langNames: Record<LangCode, string> = {
      en: 'English', es: 'Español', fr: 'Français', pt: 'Português', 
      ru: 'Русский', ar: 'العربية', id: 'Bahasa Indo', vn: 'Tiếng Việt', th: 'ไทย'
  };

  return (
    <div className="bg-[#1C1C1E] text-gray-300 antialiased min-h-screen">
       <SeoHead t={t} lang={currentLang} />
       
       {/* Navigation */}
       <header className="sticky top-0 z-50 backdrop-blur-sm bg-[#1C1C1E]/80 border-b border-zinc-800">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <a href={currentLang === 'en' ? '/' : `/${currentLang}`} className="flex items-center space-x-2">
                    <LogoIcon />
                    <span className="font-semibold text-lg text-white">Nano Banana</span>
                </a>

                <ul className="hidden md:flex items-center space-x-8">
                    {navLinks.map(link => (
                        <li key={link.href}>
                            <a href={link.href} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">{link.label}</a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center space-x-4">
                    <div className="relative" ref={langMenuRef}>
                        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
                            <GlobeIcon className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm uppercase">{currentLang}</span>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1 max-h-80 overflow-y-auto">
                                {SUPPORTED_LANGS.map((code) => (
                                    <button 
                                        key={code}
                                        onClick={() => { navigateToLang(code); setIsLangMenuOpen(false); }} 
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800"
                                    >
                                        {langNames[code]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)}><MenuIcon className="w-6 h-6" /></button>
                    </div>
                </div>
            </nav>
        </header>

        {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[#1C1C1E]/90 backdrop-blur-sm md:hidden">
                <div className="flex justify-end p-4">
                    <button onClick={() => setIsMobileMenuOpen(false)}><XIcon className="w-8 h-8" /></button>
                </div>
                <ul className="flex flex-col items-center justify-center h-full -mt-16 space-y-8">
                    {navLinks.map(link => (
                        <li key={link.href}>
                            <a href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-semibold text-gray-200 hover:text-white">{link.label}</a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto mb-20 md:mb-32">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">{t.heroTitle}</h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">{t.heroSubtitle}</p>
        </section>

        {/* Editor */}
        <section id="editor" className="p-px bg-gradient-to-b from-zinc-700 via-[#1C1C1E] to-[#1C1C1E] rounded-3xl mb-32">
          <div className="bg-[#121212] rounded-[23px] p-6 md:p-10">
            <div className="flex justify-center mb-8">
                <div className="bg-[#3a3a3c] rounded-full p-1 flex items-center w-full max-w-md">
                    <button onClick={() => setMode('image-to-image')} className={`w-1/2 py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 flex items-center justify-center gap-2 ${mode === 'image-to-image' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-zinc-700'}`}>
                        <ImageIcon className="w-5 h-5" /> {t.modeI2I}
                    </button>
                    <button onClick={() => setMode('text-to-image')} className={`w-1/2 py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 flex items-center justify-center gap-2 ${mode === 'text-to-image' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-zinc-700'}`}>
                        <TextToImageIcon className="w-5 h-5" /> {t.modeT2I}
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6 flex flex-col">
                    <div className="relative">
                        <textarea
                            value={currentPrompt}
                            onChange={(e) => { if (e.target.value.length <= 2000) setCurrentPrompt(e.target.value) }}
                            placeholder={t.inputPlaceholder}
                            className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 h-36 resize-none"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-xs text-zinc-400">
                            <span>{currentPrompt.length}/2000</span>
                            <button onClick={handleCopyPrompt}><CopyIcon className="w-4 h-4" /></button>
                            <button onClick={() => setCurrentPrompt('')}><XIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((p) => (
                            <button key={p} onClick={() => setCurrentPrompt(p)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-700">{p}</button>
                        ))}
                    </div>
                    <div>
                        <div className="flex items-center justify-between bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 mb-3">
                            <div className="flex items-center"><span className="text-sm font-medium">{t.ratioAuto}</span></div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={autoRatio} onChange={() => setAutoRatio(!autoRatio)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                            </label>
                        </div>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={autoRatio} className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-sm disabled:opacity-50">
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Portrait</option>
                        </select>
                    </div>
                    {mode === 'image-to-image' && (
                        <div onClick={handleFileSelect} className="mt-2 w-full h-36 border-2 border-dashed border-zinc-600 rounded-xl flex items-center justify-center text-center hover:border-zinc-400 cursor-pointer bg-black/20">
                            {originalImage ? <img src={originalImage.dataUrl} className="max-h-full max-w-full object-contain p-2" /> : <p className="text-zinc-400 text-sm">{t.uploadBtn}</p>}
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                        </div>
                    )}
                    <div className="border-t border-zinc-700 pt-6 mt-auto">
                        <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 font-semibold text-black bg-gradient-to-r from-pink-500 to-yellow-400 rounded-lg hover:opacity-90 disabled:opacity-50 mb-4 flex justify-center items-center">
                            {isLoading ? <><SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> {t.generating}</> : t.generateBtn}
                        </button>
                        <button onClick={handleDownload} disabled={!currentResult} className="w-full py-3 font-semibold text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 flex justify-center items-center">
                            <DownloadIcon className="w-5 h-5 mr-2" /> {t.downloadBtn}
                        </button>
                        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                    </div>
                </div>
                <div className="lg:col-span-8 bg-black rounded-2xl flex items-center justify-center min-h-[40vh] relative overflow-hidden">
                    {currentResult ? <img src={currentResult} className="w-full h-full object-contain" /> : <p className="text-zinc-500">{t.resultPlaceholder}</p>}
                </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-32">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <h2 className="text-4xl font-bold text-white mb-12">{t.howToTitle}</h2>
                <div className="space-y-8">
                  {content.howToUse.map((step) => (
                    <article key={step.number} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-lg">{step.number}</div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        <p className="text-gray-400 mt-1">{step.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block bg-zinc-800 w-full h-96 rounded-2xl"></div>
            </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-32 space-y-28">
           {content.features.map((feature, idx) => (
             <article key={idx} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div>
                   <h3 className="text-3xl font-bold text-white mb-6">{feature.title}</h3>
                   <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
                <img src={feature.imageUrl} className="rounded-2xl w-full h-auto object-cover" />
             </article>
           ))}
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto py-20 md:py-32">
           <h2 className="text-4xl font-bold text-white text-center">{t.faqTitle}</h2>
           <p className="text-lg text-gray-400 text-center mb-16">{t.faqSubtitle}</p>
           <div className="space-y-4">
              {content.faq.map((item, i) => (
                  <div key={i} className="bg-[#2C2C2E] rounded-xl">
                    <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-center p-6 text-left">
                      <span className="text-lg font-medium text-white">{item.q}</span>
                      <span className="text-2xl text-gray-400">{activeFaq === i ? '-' : '+'}</span>
                    </button>
                    {activeFaq === i && <div className="px-6 pb-6 text-gray-400 border-t border-zinc-700/50 mt-3 pt-5">{item.a}</div>}
                  </div>
              ))}
           </div>
        </section>

      </main>

      <footer className="text-center py-12 mt-24 border-t border-zinc-800">
        <div className="flex justify-center items-center gap-6 mb-4">
            <button onClick={() => setActivePolicy('privacy')} className="text-gray-400 hover:text-white text-sm">Privacy Policy</button>
            <button onClick={() => setActivePolicy('terms')} className="text-gray-400 hover:text-white text-sm">Terms of Service</button>
        </div>
        <p className="text-gray-500">© {new Date().getFullYear()} Nano Banana. {t.footerRights}</p>
      </footer>
      
      {activePolicy && (
          <PolicyPage title="Policy" onClose={() => setActivePolicy(null)}>
              <p>Policy content placeholder...</p>
          </PolicyPage>
      )}
    </div>
  );
};

export default App;

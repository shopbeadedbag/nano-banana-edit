import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage, generateImageFromText } from './services/geminiService';
import { LogoIcon, ChevronDownIcon, SpinnerIcon, XIcon, GlobeIcon, MenuIcon, InfoIcon, CopyIcon, ImageIcon, DownloadIcon, TextToImageIcon } from './components/icons';
import { locales, LangCode } from './locales';
import SeoHead from './SeoHead';

// --- Routing Logic ---
const SUPPORTED_LANGS: LangCode[] = ['en', 'es', 'fr', 'pt', 'ru', 'ar', 'id', 'vn', 'th'];
const DEFAULT_LANG: LangCode = 'en';

const getLangFromPath = (): LangCode => {
  const path = window.location.pathname;
  const firstSegment = path.split('/')[1]; 
  if (firstSegment && SUPPORTED_LANGS.includes(firstSegment as LangCode)) {
    return firstSegment as LangCode;
  }
  return DEFAULT_LANG;
};

const navigateToLang = (targetLang: LangCode) => {
  const currentPath = window.location.pathname;
  const segments = currentPath.split('/').filter(Boolean);
  if (segments.length > 0 && SUPPORTED_LANGS.includes(segments[0] as LangCode)) {
    segments.shift();
  }
  const cleanPath = segments.join('/');
  const newPath = targetLang === DEFAULT_LANG 
    ? `/${cleanPath}` 
    : `/${targetLang}/${cleanPath}`;
  window.location.href = newPath.replace('//', '/');
};

// --- Helpers ---
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
            if (!ctx) return reject(new Error('Could not get canvas context'));
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
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => reject(error);
        img.src = imageUrl;
    });
};

// --- Components ---
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
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close"><XIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-6 overflow-y-auto text-gray-300 space-y-4 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const currentLang = getLangFromPath();
  const t = locales[currentLang] || locales['en'];
  const langNames: Record<LangCode, string> = {
      en: 'English', es: 'Español', fr: 'Français', pt: 'Português', 
      ru: 'Русский', ar: 'العربية', id: 'Bahasa Indo', vn: 'Tiếng Việt', th: 'ไทย'
  };

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
  const langMenuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
      { href: '#editor', label: t.navEditor },
      { href: '#how-it-works', label: t.navHow },
      { href: '#features', label: t.navFeatures },
      { href: '#transformations', label: t.navTrans },
      { href: '#faq', label: t.navFaq },
  ];

  const faqList = [
    { q: "What is Nano Banana AI Image Editor?", a: "Nano Banana is a conversational AI image editor that transforms photos based on natural language descriptions." },
    { q: "How do I edit images with AI?", a: "Upload your photo, type a description of the edits you want, and click Apply." },
    { q: "Is it free?", a: "Yes, Nano Banana offers free AI image editing capabilities powered by Gemini 2.5 Flash." }
  ];

  const featuresList = [
      {
        title: t.featuresTitle,
        description: "Nano Banana lets you edit images the way you think - with natural conversation. No complex tools needed.",
        imageUrl: "https://pixlr.com/images/prompter/conversational.webp",
        position: "right"
      }
  ];

  const transformationsList = [
      { title: "AI Celebrity Selfies", imageUrl: "https://pixlr.com/images/prompter/example/selfies-celebrities.webp" },
      { title: "Ghibli & Anime Art Style", imageUrl: "https://pixlr.com/images/prompter/example/ghibli-style.webp" },
      { title: "Retro 16-bit Pixel Art", imageUrl: "https://pixlr.com/images/prompter/example/pixel-art.webp" },
      { title: "Cyberpunk Cityscapes", imageUrl: "https://pixlr.com/images/prompter/example/dslr-portraits.webp" }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langMenuRef]);

  const handleFileSelect = () => document.getElementById('file-upload')?.click();
  const handleCopyPrompt = () => navigator.clipboard.writeText(currentPrompt);
  
  const handleDownload = () => {
    if (!currentResult) return;
    const link = document.createElement('a');
    link.href = currentResult;
    link.download = 'nano-banana-edit.png';
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
      }
    }
  };

  const handleSubmit = async () => {
    if (!currentPrompt) return setError('Please provide a prompt.');
    if (mode === 'image-to-image' && !originalImage) return setError('Please upload an image.');

    setIsLoading(true);
    setError(null);
    if (mode === 'image-to-image') setI2iResult(null); else setT2iResult(null);

    try {
      let newImage: string;
      if (mode === 'image-to-image') {
        newImage = await editImage(originalImage!.base64, originalImage!.mimeType, i2iPrompt);
      } else {
        newImage = await generateImageFromText(t2iPrompt);
      }
      const final = autoRatio ? newImage : await cropImage(newImage, aspectRatio);
      if (mode === 'image-to-image') setI2iResult(final); else setT2iResult(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFaq = (i: number) => setActiveFaq(activeFaq === i ? null : i);

  return (
    <div className="bg-[#1C1C1E] text-gray-300 antialiased min-h-screen">
       <SeoHead t={t} lang={currentLang} />

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
                        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors" aria-label="Language Selector">
                            <GlobeIcon className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm uppercase">{currentLang}</span>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1 max-h-80 overflow-y-auto">
                                {SUPPORTED_LANGS.map((code) => (
                                    <button key={code} onClick={() => { navigateToLang(code); setIsLangMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800">
                                        {langNames[code]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Menu"><MenuIcon className="w-6 h-6" /></button>
                    </div>
                </div>
            </nav>
        </header>

        {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[#1C1C1E]/90 backdrop-blur-sm md:hidden">
                <div className="flex justify-end p-4"><button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close"><XIcon className="w-8 h-8" /></button></div>
                <ul className="flex flex-col items-center justify-center h-full -mt-16 space-y-8">
                    {navLinks.map(link => (
                        <li key={link.href}><a href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-semibold text-gray-200">{link.label}</a></li>
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
                            onChange={(e) => e.target.value.length <= 2000 && setCurrentPrompt(e.target.value)} 
                            placeholder={t.inputPlaceholder} 
                            className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-white h-36 resize-none" 
                            aria-label="Input Prompt"
                        />
                        <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-xs text-zinc-400">
                            <span>{currentPrompt.length}/2000</span>
                            <button onClick={handleCopyPrompt} aria-label="Copy"><CopyIcon className="w-4 h-4" /></button>
                            <button onClick={() => setCurrentPrompt('')} aria-label="Clear"><XIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 mb-3">
                            <span className="text-sm font-medium">{t.ratioAuto}</span>
                            <input type="checkbox" checked={autoRatio} onChange={() => setAutoRatio(!autoRatio)} aria-label="Auto Ratio Toggle" />
                        </div>
                        <select 
                            value={aspectRatio} 
                            onChange={(e) => setAspectRatio(e.target.value)} 
                            disabled={autoRatio} 
                            className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-sm disabled:opacity-50"
                            aria-label="Aspect Ratio"
                        >
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Portrait</option>
                        </select>
                    </div>
                    {mode === 'image-to-image' && (
                        <div onClick={handleFileSelect} className="mt-2 w-full h-36 border-2 border-dashed border-zinc-600 rounded-xl flex items-center justify-center text-center hover:border-zinc-400 cursor-pointer bg-black/20" role="button" aria-label="Upload File">
                            {originalImage ? <img src={originalImage.dataUrl} className="max-h-full max-w-full object-contain p-2" alt="Preview" /> : <p className="text-zinc-400 text-sm">{t.uploadBtn}</p>}
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
                    {currentResult ? <img src={currentResult} className="w-full h-full object-contain" alt="Generated Result" /> : <p className="text-zinc-500">Image Preview</p>}
                </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-32">
             <h2 className="text-4xl font-bold text-white mb-12 text-center">{t.howToTitle}</h2>
             <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="space-y-8">
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">1</div><p className="text-gray-300">Upload Image</p></div>
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">2</div><p className="text-gray-300">Enter Prompt</p></div>
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">3</div><p className="text-gray-300">Generate & Download</p></div>
                </div>
                <div className="hidden lg:block bg-zinc-800 w-full h-64 rounded-2xl"></div>
             </div>
        </section>

        {/* Features - Optimized Images */}
        <section id="features" className="py-20 md:py-32 space-y-28">
           {featuresList.map((feature, idx) => (
             <article key={idx} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div>
                   <h3 className="text-3xl font-bold text-white mb-6">{feature.title}</h3>
                   <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
                {/* Lazy load feature images to prioritize LCP */}
                <img 
                    src={feature.imageUrl} 
                    className="rounded-2xl w-full h-auto object-cover bg-zinc-800" 
                    alt={feature.title} 
                    loading="lazy"
                    decoding="async"
                    width="600"
                    height="400"
                />
             </article>
           ))}
        </section>

        {/* Transformations - Optimized Grid */}
        <section id="transformations" className="py-20 md:py-32 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">{t.transTitle}</h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-16">{t.transSubtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {transformationsList.map((item, index) => (
              <article key={index} className="bg-[#2C2C2E] p-5 rounded-2xl text-left">
                <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="rounded-lg w-full h-auto object-cover mb-4 aspect-[3/2] bg-zinc-800" 
                    loading="lazy" 
                    decoding="async"
                    width="300"
                    height="200"
                />
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto py-20 md:py-32">
           <h2 className="text-4xl font-bold text-white text-center">{t.faqTitle}</h2>
           <p className="text-lg text-gray-400 text-center mb-16">{t.faqSubtitle}</p>
           <div className="space-y-4">
              {faqList.map((item, i) => (
                  <div key={i} className="bg-[#2C2C2E] rounded-xl">
                    <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-center p-6 text-left" aria-expanded={activeFaq === i}>
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
              <p className="p-4 text-gray-300">Policies are universal and apply to all languages.</p>
          </PolicyPage>
      )}
    </div>
  );
};

export default App;
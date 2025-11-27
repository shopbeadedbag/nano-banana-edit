import React, { useState, useRef, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage, generateImageFromText } from './services/geminiService';
import { LogoIcon, ChevronDownIcon, SpinnerIcon, XIcon, GlobeIcon, MenuIcon, InfoIcon, CopyIcon, ImageIcon, DownloadIcon, TextToImageIcon, CheckIcon } from './components/icons';
import SeoHead from './SeoHead';

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
  const [autoRatio, setAutoRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [activePolicy, setActivePolicy] = useState<string | null>(null);

  const currentPrompt = mode === 'image-to-image' ? i2iPrompt : t2iPrompt;
  const setCurrentPrompt = mode === 'image-to-image' ? setI2iPrompt : setT2iPrompt;
  const currentResult = mode === 'image-to-image' ? i2iResult : t2iResult;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navLinks = [
      { href: '#editor', label: 'Editor' },
      { href: '#how-it-works', label: 'How It Works' },
      { href: '#features', label: 'Features' },
      { href: '#transformations', label: 'Transformations' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#faq', label: 'FAQ' },
  ];

  const faqList = [
    { q: "What is Nano Banana AI Image Editor?", a: "Nano Banana is a conversational AI image editor that transforms photos based on natural language descriptions. Simply upload an image, describe how you want to edit it, and our AI will apply your changes instantly. It combines the power of advanced AI models with an intuitive chat-based interface." },
    { q: "How do I edit images with AI?", a: "Upload your photo, type a description of the edits you want (like \"make it sunset\" or \"add dramatic lighting\"), select your preferred AI model (Fast, Pro, or Ultra), and click Apply. The AI will process your request and show you the edited image in seconds." },
    { q: "What are the different AI models?", a: "Nano Banana Fast delivers quick results for simple edits. Nano Banana Pro provides enhanced quality for detailed work. Nano Banana Ultra unleashes maximum AI power for professional-grade transformations. Switch between Nano Banana models anytime to match your project needs." },
    { q: "Can I undo or go back to previous edits?", a: "Yes! Nano Banana automatically saves your edit history with up to 10 versions. Click any previous version in the history stack to continue editing from that point or download earlier versions." },
    { q: "What image formats are supported?", a: "Nano Banana supports all common image formats including JPG, PNG, and WEBP. Images must be at least 250x250 pixels for best results." },
    { q: "How many credits does it cost?", a: "Credit costs vary by AI model: Fast costs 1 credit, Pro costs 3 credits, and Ultra costs 5 credits per edit. You can purchase credits or subscribe to Pixlr Plus for unlimited editing." },
    { q: "Can I edit the same image multiple times?", a: "Absolutely! Each new prompt applies to your currently selected image in the history. You can continue refining and editing the same photo as many times as you want, building on previous edits or starting fresh from earlier versions." },
    { q: "Is my image data private and secure?", a: "Yes, your privacy is our priority. Uploaded images are processed securely and are not shared or used for training purposes. All images are handled according to our privacy policy and industry security standards." }
  ];

  const featuresList = [
      {
        title: "Nano Banana Conversational AI Photo Editing",
        description: "Nano Banana lets you edit images the way you think - with natural conversation. No complex tools or tutorials needed. Just describe what you want and Nano Banana's advanced AI understands and executes your creative vision instantly. From simple adjustments to dramatic transformations, Nano Banana's conversational editing makes professional results accessible to everyone.",
        imageUrl: "https://pixlr.com/images/prompter/conversational.webp",
        position: "right"
      },
      {
        title: "Nano Banana Edit History & Version Control",
        description: "Never lose your creative progress with Nano Banana. The AI editor automatically saves every edit in an intuitive visual timeline. Click any previous Nano Banana version to continue editing from that point, or compare results side-by-side. Your Nano Banana editing journey is preserved, giving you complete creative freedom to explore and experiment.",
        imageUrl: "https://pixlr.com/images/prompter/history.webp",
        position: "left"
      },
      {
        title: "Nano Banana AI Models - Fast, Pro, and Ultra",
        description: "Nano Banana offers three powerful AI models to choose from. Nano Banana Fast delivers quick results for simple edits. Nano Banana Pro provides enhanced quality for detailed work. Nano Banana Ultra unleashes maximum AI power for professional-grade transformations. Switch between Nano Banana models anytime to match your project needs.",
        imageUrl: "https://pixlr.com/images/prompter/banana.webp",
        position: "right"
      }
  ];

  const transformationsList = [
      { title: "AI Celebrity Selfies", description: "Create realistic selfie photos with your favorite celebrities using Nano Banana AI. Upload your photo and generate authentic-looking moments with movie stars, musicians, and famous personalities in stunning quality.", imageUrl: "https://pixlr.com/images/prompter/example/selfies-celebrities.webp" },
      { title: "3D Figurine & Collectible Art", description: "Transform your photos into high-end collectible figurines with professional packaging design. Nano Banana creates museum-quality 3D models, perfect for personalized merchandise, display art, and unique gifts.", imageUrl: "https://pixlr.com/images/prompter/example/3d-box-figurine.webp" },
      { title: "LEGO Minifigure Creator", description: "Convert yourself into a custom LEGO minifigure with personalized animal companion in a glass display case. Create unique collectible-style artwork with engraved details and museum-quality presentation.", imageUrl: "https://pixlr.com/images/prompter/example/lego-me.webp" },
      { title: "Ghibli & Anime Art Style", description: "Transform your photos into beautiful Studio Ghibli-style artwork with Nano Banana AI. Get hand-drawn anime aesthetics, watercolor backgrounds, and that magical Ghibli feeling in your images.", imageUrl: "https://pixlr.com/images/prompter/example/ghibli-style.webp" },
      { title: "DSLR Professional Portraits", description: "Achieve cinematic golden-hour portraits with professional DSLR quality using Nano Banana. Add bokeh backgrounds, perfect lighting, and film-grade color grading to your photos instantly.", imageUrl: "https://pixlr.com/images/prompter/example/dslr-portraits.webp" },
      { title: "Time Travel Transformations", description: "Travel through decades with Nano Banana AI photo editor. Transform yourself into authentic 1890s Victorian portraits, groovy 1970s disco style, neon 1980s fashion, or any era with period-accurate clothing and aesthetics.", imageUrl: "https://pixlr.com/images/prompter/example/me-as-1980.webp" },
      { title: "Renaissance & Classical Art", description: "Turn modern photos into timeless Renaissance masterpieces with Nano Banana. Create oil painting effects, classical portraiture, and museum-worthy artwork with authentic brush strokes and period styling.", imageUrl: "https://pixlr.com/images/prompter/example/renaissance-painting.webp" },
      { title: "Pop Star & Concert Scenes", description: "Transform into a performing artist on stage with massive crowds and epic screens using Nano Banana AI. Create professional concert photography with dramatic stage lighting and arena-scale productions.", imageUrl: "https://pixlr.com/images/prompter/example/pop-star.webp" },
      { title: "Extreme Adventure Photography", description: "Create breathtaking skydiving, mountain climbing, and extreme sports photos with Nano Banana AI. Generate hyperrealistic action shots with professional wide-angle camera effects and adrenaline-pumping perspectives.", imageUrl: "https://pixlr.com/images/prompter/example/sky-diving.webp" },
      { title: "Retro 16-bit Pixel Art", description: "Convert your photos into nostalgic 16-bit pixel art and retro gaming graphics with Nano Banana. Perfect for creating vintage game-style avatars, social media content, and nostalgic digital art.", imageUrl: "https://pixlr.com/images/prompter/example/pixel-art.webp" },
      { title: "Artistic Silhouette Effects", description: "Create mysterious and artistic silhouette photography with frosted glass effects using Nano Banana. Perfect for dramatic black and white portraits with professional gradient backgrounds and atmospheric lighting.", imageUrl: "https://pixlr.com/images/prompter/example/blurred-silhouette.webp" },
      { title: "AI Object & Background Removal", description: "Remove unwanted objects, people, or background elements from photos while preserving all original details. Nano Banana's AI seamlessly fills removed areas maintaining resolution, sharpness, and natural textures.", imageUrl: "https://pixlr.com/images/prompter/example/remove-objects.webp" }
  ];

  const pricingList = [
      {
          name: "Starter Plan",
          price: "$15",
          period: "/ month",
          credits: "150 credits / month",
          approx: "≈75 images",
          features: [
              "75 high-quality AI images per month",
              "Access to Nano Banana Fast model",
              "All standard style templates",
              "Standard generation speed",
              "JPG/PNG download formats",
              "Basic customer support",
              "Commercial use license"
          ],
          buttonText: "Start with Starter",
          highlight: false
      },
      {
          name: "Pro Plan",
          price: "$39",
          period: "/ month",
          credits: "800 credits / month",
          approx: "≈400 images",
          features: [
              "400 high-quality images per month",
              "Access to Nano Banana Pro + Gemini 2.5 Flash models",
              "Advanced style templates (Ghibli, 3D, DSLR, Renaissance, etc.)",
              "Priority generation queue",
              "JPG/PNG/WebP downloads",
              "Batch generation",
              "Advanced editing tools (object removal, enhancements, re-paint)",
              "Priority support",
              "Commercial license"
          ],
          buttonText: "Get Pro Plan",
          highlight: true,
          label: "Most Popular"
      },
      {
          name: "Ultra Plan",
          price: "$160",
          period: "/ month",
          credits: "4600 credits / month",
          approx: "≈2300 images",
          features: [
              "2300 high-quality AI images per month",
              "Access to Nano Banana Ultra + high-performance models",
              "Fastest generation speeds",
              "All templates + all future model access",
              "JPG/PNG/WebP/TIFF downloads",
              "Large-scale batch generation",
              "Professional editing tool suite",
              "Team management & permissions",
              "Dedicated account manager",
              "Commercial license"
          ],
          buttonText: "Upgrade to Ultra",
          highlight: false
      }
  ];

  const handleFileSelect = () => fileInputRef.current?.click();
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
       <SeoHead />

       <header className="sticky top-0 z-50 backdrop-blur-sm bg-[#1C1C1E]/80 border-b border-zinc-800">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <a href="/" className="flex items-center space-x-2">
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
                    <span className="text-sm text-gray-300">English</span>
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
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">Edit Images with Nano Banana</h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">Edit your photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Upload any picture, describe your changes, and let Nano Banana transform your images in seconds. No design skills required.</p>
        </section>

        {/* Editor */}
        <section id="editor" className="p-px bg-gradient-to-b from-zinc-700 via-[#1C1C1E] to-[#1C1C1E] rounded-3xl mb-32">
          <div className="bg-[#121212] rounded-[23px] p-6 md:p-10">
            <div className="flex justify-center mb-8">
                <div className="bg-[#3a3a3c] rounded-full p-1 flex items-center w-full max-w-md">
                    <button onClick={() => setMode('image-to-image')} className={`w-1/2 py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 flex items-center justify-center gap-2 ${mode === 'image-to-image' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-zinc-700'}`}>
                        <ImageIcon className="w-5 h-5" /> Image to Image
                    </button>
                    <button onClick={() => setMode('text-to-image')} className={`w-1/2 py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 flex items-center justify-center gap-2 ${mode === 'text-to-image' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-zinc-700'}`}>
                        <TextToImageIcon className="w-5 h-5" /> Text to Image
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6 flex flex-col">
                    <div className="relative">
                        <textarea 
                            value={currentPrompt} 
                            onChange={(e) => e.target.value.length <= 2000 && setCurrentPrompt(e.target.value)} 
                            placeholder="Input prompt here"
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
                            <span className="text-sm font-medium">Auto Ratio</span>
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
                            {originalImage ? <img src={originalImage.dataUrl} className="max-h-full max-w-full object-contain p-2" alt="Preview" /> : <p className="text-zinc-400 text-sm">Click / Drag & Drop to Upload</p>}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                        </div>
                    )}
                    <div className="border-t border-zinc-700 pt-6 mt-auto">
                        <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 font-semibold text-black bg-gradient-to-r from-pink-500 to-yellow-400 rounded-lg hover:opacity-90 disabled:opacity-50 mb-4 flex justify-center items-center">
                            {isLoading ? <><SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> Generating...</> : "Generate Now"}
                        </button>
                        <button onClick={handleDownload} disabled={!currentResult} className="w-full py-3 font-semibold text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 flex justify-center items-center">
                            <DownloadIcon className="w-5 h-5 mr-2" /> Download
                        </button>
                        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                    </div>
                </div>
                <div className="lg:col-span-8 bg-black rounded-2xl flex items-center justify-center min-h-[40vh] relative overflow-hidden">
                    {currentResult ? <img src={currentResult} className="w-full h-full object-contain" alt="Generated Result" /> : <p className="text-zinc-500">Your generated image will appear here</p>}
                </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 md:py-32">
             <h2 className="text-4xl font-bold text-white mb-12 text-center">How to Use Nano Banana AI Image Editor</h2>
             <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="space-y-8">
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">1</div><div><h3 className="text-xl font-semibold text-white">Upload Your Image</h3><p className="text-gray-400 mt-1">Drag and drop or browse to select any photo you want to edit. Nano Banana supports all common image formats including JPG, PNG, and WEBP.</p></div></div>
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">2</div><div><h3 className="text-xl font-semibold text-white">Describe Your Vision</h3><p className="text-gray-400 mt-1">Type a natural language prompt describing how you want to transform your image. Be as creative or specific as you like - from simple color changes to complex artistic transformations.</p></div></div>
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">3</div><div><h3 className="text-xl font-semibold text-white">Choose Your Model</h3><p className="text-gray-400 mt-1">Select Fast for quick edits, Pro for better quality, or Ultra for the best results. Each model is optimized for different use cases and credit costs.</p></div></div>
                   <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold">4</div><div><h3 className="text-xl font-semibold text-white">Apply and Download</h3><p className="text-gray-400 mt-1">Click Apply and watch AI transform your image in seconds. Browse your edit history, make adjustments, or download your final masterpiece.</p></div></div>
                </div>
                <div><img src="https://pixlr.com/images/prompter/nano-banan-ai-image-editor.webp" alt="How it works" className="rounded-2xl w-full h-auto object-cover" loading="lazy" /></div>
             </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-32 space-y-28">
           {featuresList.map((feature, idx) => (
             <article key={idx} className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${feature.position === 'left' ? 'lg:flex-row-reverse' : ''}`}>
                <div className={feature.position === 'left' ? 'lg:order-2' : ''}>
                   <h3 className="text-3xl font-bold text-white mb-6">{feature.title}</h3>
                   <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
                <div className={feature.position === 'left' ? 'lg:order-1' : ''}>
                    <img src={feature.imageUrl} className="rounded-2xl w-full h-auto object-cover bg-zinc-800" alt={feature.title} loading="lazy" decoding="async" width="600" height="400" />
                </div>
             </article>
           ))}
        </section>

        {/* Transformations */}
        <section id="transformations" className="py-20 md:py-32 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Popular Nano Banana AI Image Transformations</h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-16">Explore trending AI-powered photo effects and creative transformations with Nano Banana.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {transformationsList.map((item, index) => (
              <article key={index} className="bg-[#2C2C2E] p-5 rounded-2xl text-left">
                <img src={item.imageUrl} alt={item.title} className="rounded-lg w-full h-auto object-cover mb-4 aspect-[3/2] bg-zinc-800" loading="lazy" decoding="async" width="300" height="200" />
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 md:py-32">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl font-bold text-white mb-6">Simple, Transparent Pricing</h2>
                <p className="text-lg text-gray-400">Choose the perfect plan for your creative needs. Upgrade, downgrade, or cancel anytime.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {pricingList.map((plan, index) => (
                    <div 
                        key={index} 
                        className={`relative rounded-2xl p-8 flex flex-col h-full bg-[#2C2C2E] ${plan.highlight ? 'ring-2 ring-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.15)] scale-105 z-10' : 'border border-zinc-700'}`}
                    >
                        {plan.label && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-pink-500 to-yellow-400 text-black text-sm font-bold px-4 py-1 rounded-full whitespace-nowrap">
                                {plan.label}
                            </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-bold text-white">{plan.price}</span>
                            <span className="text-gray-400 ml-2">{plan.period}</span>
                        </div>
                        <div className="mb-6">
                             <p className="text-pink-400 font-medium">{plan.credits}</p>
                             <p className="text-sm text-gray-500">{plan.approx}</p>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start text-sm text-gray-300">
                                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button 
                            className={`w-full py-3 rounded-lg font-bold transition-all ${
                                plan.highlight 
                                ? 'bg-gradient-to-r from-pink-500 to-yellow-400 text-black hover:opacity-90' 
                                : 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700'
                            }`}
                        >
                            {plan.buttonText}
                        </button>
                    </div>
                ))}
            </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto py-20 md:py-32">
           <h2 className="text-4xl font-bold text-white text-center">Frequently Asked Questions</h2>
           <p className="text-lg text-gray-400 text-center mb-16">Do you have a question?</p>
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
        <p className="text-gray-500">© {new Date().getFullYear()} Nano Banana. All rights reserved.</p>
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
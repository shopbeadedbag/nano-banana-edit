import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage } from './services/geminiService';
import { LogoIcon, StarIcon, ChevronDownIcon, ArrowRightIcon, SpinnerIcon, RetryIcon, ShareIcon, XIcon, GlobeIcon, MenuIcon, InfoIcon, ResetIcon, CopyIcon, ImageIcon, DownloadIcon, CloudUploadIcon } from './components/icons';

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
                // Original image is wider than target, crop the width
                cropHeight = originalHeight;
                cropWidth = originalHeight * targetRatio;
                cropX = (originalWidth - cropWidth) / 2;
                cropY = 0;
            } else {
                // Original image is taller than target, crop the height
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

            // You can change the output format here if needed, e.g., 'image/jpeg'
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (error) => reject(error);
        img.src = imageUrl;
    });
};


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('English');
  const [autoRatio, setAutoRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // Content previously from content.json
  const content = {
    howToUse: {
      title: "How to Use Nano Banana AI Image Editor",
      imageUrl: "https://devtool.tech/api/placeholder/600/600",
      steps: [
        { number: 1, title: "Upload Your Image", description: "Drag and drop or browse to select any photo you want to edit. Nano Banana supports all common image formats including JPG, PNG, and WEBP." },
        { number: 2, title: "Describe Your Vision", description: "Type a natural language prompt describing how you want to transform your image. Be as creative or specific as you like - from simple color changes to complex artistic transformations." },
        { number: 3, title: "Choose Your Model", description: "Select Fast for quick edits, Pro for better quality, or Ultra for the best results. Each model is optimized for different use cases and credit costs." },
        { number: 4, title: "Apply and Download", description: "Click Apply and watch AI transform your image in seconds. Browse your edit history, make adjustments, or download your final masterpiece." }
      ]
    },
    features: [
      { title: "Nano Banana Conversational AI Photo Editing", description: "Nano Banana lets you edit images the way you think - with natural conversation. No complex tools or tutorials needed. Just describe what you want and Nano Banana's advanced AI understands and executes your creative vision instantly. From simple adjustments to dramatic transformations, Nano Banana's conversational editing makes professional results accessible to everyone.", imageUrl: "https://devtool.tech/api/placeholder/600/600", imagePosition: "left" },
      { title: "Nano Banana Edit History & Version Control", description: "Never lose your creative progress with Nano Banana. The AI editor automatically saves every edit in an intuitive visual timeline. Click any previous Nano Banana version to continue editing from that point, or compare results side-by-side. Your Nano Banana editing journey is preserved, giving you complete creative freedom to explore and experiment.", imageUrl: "https://devtool.tech/api/placeholder/600/600", imagePosition: "right" },
      { title: "Nano Banana AI Models - Fast, Pro, and Ultra", description: "Nano Banana offers three powerful AI models to choose from. Nano Banana Fast delivers quick results for simple edits. Nano Banana Pro provides enhanced quality for detailed work. Nano Banana Ultra unleashes maximum AI power for professional-grade transformations. Switch between Nano Banana models anytime to match your project needs.", imageUrl: "https://devtool.tech/api/placeholder/600/600", imagePosition: "left" }
    ],
    transformations: {
      title: "Popular Nano Banana AI Image Transformations",
      subtitle: "Explore trending AI-powered photo effects and creative transformations with Nano Banana. From celebrity selfies to vintage time travel, 3D figurines to artistic masterpieces - discover unlimited creative possibilities with our AI image editor.",
      items: [
        { title: "AI Celebrity Selfies", description: "Create realistic selfie photos with your favorite celebrities using Nano Banana AI. Upload your photo and generate authentic-looking moments with movie stars, musicians, and famous personalities in stunning quality.", imageUrl: "https://devtool.tech/api/placeholder/300/200" },
        { title: "3D Figurine & Collectible Art", description: "Transform your photos into high-end collectible figurines with professional packaging design. Nano Banana creates museum-quality 3D models, perfect for personalized merchandise, display art, and unique gifts.", imageUrl: "https://devtool.tech/api/placeholder/300/200" },
        { title: "LEGO Minifigure Creator", description: "Instantly design yourself into a custom LEGO minifigure with personalized animal companion in a glass display case. Create unique collectible-style artwork with crisp details and museum-quality presentation.", imageUrl: "https://devtool.tech/api/placeholder/300/200" },
        { title: "Ghibli & Anime Art Style", description: "Transform your photos into beautiful Studio Ghibli-style artwork with Nano Banana AI. Get hand-drawn anime aesthetics, watercolor backgrounds, and that magical Ghibli feeling in your images.", imageUrl: "https://devtool.tech/api/placeholder/300/200" },
        { title: "DSLR Professional", description: "Achieve cinematic quality with professional DSLR camera bokeh backgrounds and professional color grading to your photos.", imageUrl: "https://devtool.tech/api/placeholder/300/200" },
        { title: "DSLR Professional", description: "Achieve cinematic quality with professional DSLR camera bokeh backgrounds and professional color grading to your photos.", imageUrl: "https://devtool.tech/api/placeholder/300/200" }
      ]
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Do you have a question?",
      questions: [
        { q: "What is Nano Banana AI Image Editor?", a: "Nano Banana is a conversational AI image editor that transforms photos based on natural language descriptions. Simply upload an image, describe how you want to edit it, and our AI will apply your changes instantly. It combines the power of advanced AI models with an intuitive chat-based interface." },
        { q: "How do I edit images with AI?", a: "Upload your photo, type a description of the edits you want (like \"make it sunset\" or \"add dramatic lighting\"), select your preferred AI model (Fast, Pro, or Ultra), and click Apply. The AI will process your request and show you the edited image in seconds." },
        { q: "What are the different AI models?", a: "Fast model (1 credit) provides quick edits for simple changes. Pro model (3 credits) offers better quality for detailed work. Ultra model (5 credits) delivers the highest quality results for professional-grade transformations. Choose based on your needs and quality requirements." },
        { q: "Can I undo or go back to previous edits?", a: "Yes! Nano Banana automatically saves your edit history with up to 10 versions. Click any previous version in the history stack to continue editing from that point or download earlier versions." },
        { q: "What image formats are supported?", a: "Nano Banana supports all common image formats including JPG, JPEG, PNG, WEBP, and more. Images must be at least 250x250 pixels for best results." },
        { q: "How many credits does it cost?", a: "Each AI model has a different credit cost. Fast is 1 credit, Pro is 3 credits, and Ultra is 5 credits per generation. Costs may vary based on image size and complexity." },
        { q: "Can I edit the same image multiple times?", a: "Absolutely. You can apply as many edits as you like to a single image. Each new edit builds on the previous one, and you can always go back to an earlier version in your edit history." },
        { q: "Is my image data private and secure?", a: "We prioritize your privacy. Uploaded images are processed securely and are not used for any purpose other than applying your requested edits. Please refer to our privacy policy for more details." }
      ]
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
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
    fileInputRef.current?.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };
  
  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = 'edited-by-nano-banana.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      setEditedImage(null);
      try {
        const imageFile = await fileToImageFile(file);
        setOriginalImage(imageFile);
      } catch (err) {
        setError('Failed to load image. Please try another file.');
        console.error(err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!originalImage || !prompt) {
      setError('Please upload an image and provide an editing instruction.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    try {
      const newImageFromApi = await editImage(
          originalImage.base64, 
          originalImage.mimeType, 
          prompt
      );
      if (!autoRatio) {
          const croppedImage = await cropImage(newImageFromApi, aspectRatio);
          setEditedImage(croppedImage);
      } else {
          setEditedImage(newImageFromApi);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const navLinks = [
      { href: '#editor', label: 'Editor' },
      { href: '#how-it-works', label: 'How It Works' },
      { href: '#features', label: 'Features' },
      { href: '#transformations', label: 'Transformations' },
      { href: '#faq', label: 'FAQ' },
  ];
  
  const suggestedPrompts = [
      'Change the background to a futuristic cityscape',
      'Add a pirate hat',
      'Make it look like an oil painting',
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const FaqPlusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8V16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12H16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FaqMinusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12H16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="bg-[#1C1C1E] text-gray-300 antialiased">
       <header className="sticky top-0 z-50 backdrop-blur-sm bg-[#1C1C1E]/80 border-b border-zinc-800">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <a href="#" className="flex items-center space-x-2">
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
                            <span className="hidden sm:inline text-sm">{currentLang}</span>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg py-1">
                                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentLang('English'); setIsLangMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800">English</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentLang('简体中文'); setIsLangMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800">简体中文</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentLang('Español'); setIsLangMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800">Español</a>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)}>
                            <MenuIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </nav>
        </header>

        {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[#1C1C1E]/90 backdrop-blur-sm md:hidden">
                <div className="flex justify-end p-4">
                    <button onClick={() => setIsMobileMenuOpen(false)}>
                        <XIcon className="w-8 h-8" />
                    </button>
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
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-20 md:mb-32">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">Edit Images with Nano Banana</h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">
            Edit your photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Upload any picture, describe your changes, and let Nano Banana transform your images in seconds. No design skills required.
          </p>
        </section>

        {/* Editor Section */}
        <section id="editor" className="p-px bg-gradient-to-b from-zinc-700 via-[#1C1C1E] to-[#1C1C1E] rounded-3xl mb-32">
          <div className="bg-[#121212] rounded-[23px] p-6 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6 flex flex-col">
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => {
                                if (e.target.value.length <= 2000) {
                                    setPrompt(e.target.value)
                                }
                            }}
                            placeholder="Input prompt here"
                            className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition resize-none h-36"
                            maxLength={2000}
                        />
                        <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-xs text-zinc-400">
                            <span>{prompt.length}/2000</span>
                            <button onClick={handleCopyPrompt} className="hover:text-white transition-colors" aria-label="Copy prompt"><CopyIcon className="w-4 h-4" /></button>
                            <button onClick={() => setPrompt('')} className="hover:text-white transition-colors" aria-label="Clear prompt"><XIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-zinc-400 mb-3">✨ Try these ideas:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedPrompts.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPrompt(p)}
                                    className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-full text-sm hover:bg-zinc-700 transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300">Ratio</label>
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center justify-between bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium">Auto Ratio</span>
                                    <InfoIcon className="w-4 h-4 ml-1.5 text-zinc-400" />
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={autoRatio} onChange={() => setAutoRatio(!autoRatio)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                                </label>
                            </div>
                            <select 
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                disabled={autoRatio}
                                className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none bg-no-repeat bg-right-3 disabled:opacity-50 disabled:cursor-not-allowed" 
                                style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em'}}>
                                <option value="1:1">1:1 Square</option>
                                <option value="16:9">16:9 Landscape</option>
                                <option value="9:16">9:16 Portrait</option>
                                <option value="4:3">4:3 Landscape</option>
                                <option value="3:4">3:4 Portrait</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-300">Images</label>
                        <div onClick={handleFileSelect} className="mt-2 w-full h-36 border-2 border-dashed border-zinc-600 rounded-xl flex items-center justify-center text-center hover:border-zinc-400 cursor-pointer transition-colors bg-black/20">
                            {originalImage ? (
                                <img src={originalImage.dataUrl} alt="uploaded preview" className="max-h-full max-w-full object-contain p-2" />
                            ) : (
                                <p className="text-zinc-400 text-sm">Click / Drag & Drop to Upload</p>
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, image/heic" />
                        </div>
                    </div>
                    
                    <div className="border-t border-zinc-700 !mt-auto pt-6">
                      <div className="space-y-4">
                          <button
                              onClick={handleSubmit}
                              disabled={isLoading || !originalImage || !prompt}
                              className="w-full py-3 text-center font-semibold text-black bg-gradient-to-r from-pink-500 to-yellow-400 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center text-base"
                          >
                              {isLoading ? (
                                  <SpinnerIcon className="w-6 h-6 animate-spin text-black" />
                              ) : (
                                  <>
                                      Generate Now
                                  </>
                              )}
                          </button>
                          <button
                              onClick={handleDownload}
                              disabled={!editedImage || isLoading}
                              className="w-full py-3 text-center font-semibold text-white bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-base"
                              aria-label="Download edited image"
                          >
                              <DownloadIcon className="w-5 h-5 mr-2" />
                              <span>Download</span>
                          </button>
                      </div>
                      {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
                    </div>
                </div>
                
                <div className="lg:col-span-8 bg-black rounded-2xl flex items-center justify-center min-h-[40vh] lg:min-h-0 relative overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center text-zinc-400 z-10">
                            <SpinnerIcon className="w-10 h-10 animate-spin text-white" />
                            <p className="mt-4 font-medium">Generating...</p>
                        </div>
                    )}
                    {!isLoading && editedImage && (
                        <img src={editedImage} alt="Edited result" className="w-full h-full object-contain rounded-2xl" />
                    )}
                    {!isLoading && !editedImage && (
                        <div className="text-center text-zinc-500 z-10 p-8">
                            <ImageIcon className="w-20 h-20 mx-auto opacity-30" />
                            <p className="mt-6 font-medium">Your generated image will appear here</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-12">{content.howToUse.title}</h2>
              <div className="space-y-8">
                {content.howToUse.steps.map((step) => (
                  <div key={step.number} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-lg">{step.number}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                      <p className="text-gray-400 mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <img src={content.howToUse.imageUrl} alt="Woman in red dress" className="rounded-2xl w-full h-auto object-cover" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 space-y-28">
          {content.features.map((feature, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${feature.imagePosition === 'right' ? 'lg:[direction:rtl]' : ''}`}>
              <div className="lg:[direction:ltr]">
                <h3 className="text-3xl font-bold text-white mb-6">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
              <div>
                <img src={feature.imageUrl} alt={feature.title} className="rounded-2xl w-full h-auto object-cover" />
              </div>
            </div>
          ))}
        </section>

        {/* Transformations Section */}
        <section id="transformations" className="py-20 md:py-32 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">{content.transformations.title}</h2>
          <p className="text-gray-400 max-w-3xl mx-auto mb-16">{content.transformations.subtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {content.transformations.items.map((item, index) => (
              <div key={index} className="bg-[#2C2C2E] p-5 rounded-2xl text-left">
                <img src={item.imageUrl} alt={item.title} className="rounded-lg w-full h-auto object-cover mb-4 aspect-[3/2]" />
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-3xl mx-auto py-20 md:py-32">
          <h2 className="text-4xl font-bold text-white text-center">{content.faq.title}</h2>
          <p className="text-lg text-gray-400 text-center mb-16">{content.faq.subtitle}</p>
          <div className="space-y-4">
            {content.faq.questions.map((faq, i) => (
              <div key={i} className="bg-[#2C2C2E] rounded-xl">
                <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-center p-6 text-left">
                  <span className={`text-lg font-medium ${activeFaq === i ? 'text-white' : 'text-gray-300'}`}>{faq.q}</span>
                  {activeFaq === i ? <FaqMinusIcon /> : <FaqPlusIcon />}
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-gray-400 border-t border-zinc-700/50 mt-3 pt-5">
                    <p className="leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="text-center py-12 mt-24 border-t border-zinc-800">
        <p className="text-gray-500">© {new Date().getFullYear()} Nano Banana. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
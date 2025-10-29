import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage } from './services/geminiService';
import { LogoIcon, StarIcon, ChevronDownIcon, ArrowRightIcon, SpinnerIcon, RetryIcon, ShareIcon, XIcon, GlobeIcon, MenuIcon, InfoIcon, ResetIcon, CopyIcon, ImageIcon } from './components/icons';

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
      const newImageFromApi = await editImage(originalImage.base64, originalImage.mimeType, prompt);
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
      { href: '#why-use', label: 'Why Us' },
      { href: '#testimonials', label: 'Testimonials' },
      { href: '#faq', label: 'FAQ' },
  ];

  const testimonials = [
    { name: 'Sophie M.', text: 'So many AI tools out there but I always come back to Krea. It\'s really the one AI platform that "just works".' },
    { name: 'Daniel', text: 'Ultra fast generations. Extremely simple to use. All the latest AI models.' },
    { name: 'Lynn', text: 'Krea\'s interfaces are the best in the industry. Everything feels so clean and easy to use.' },
    { name: 'Gravion', text: 'Still the most powerful AI creative suite out there.' },
  ];

  const faqs = [
    { q: 'What is Nano Banana?', a: 'Nano Banana is a free AI image editor powered by Gemini 2.5 Flash. It allows you to make complex photo edits using simple text descriptions, no design skills required.' },
    { q: 'Is the editor free?', a: 'Yes, the basic features of the Nano Banana image editor are completely free to use. Advanced features may be available in future premium plans.' },
    { q: 'How do I use the AI image editor?', a: 'Simply upload your image, type a description of the change you want to make (e.g., "add a pirate hat" or "change background to a beach"), and click "Generate". The AI will process your request and create a new image.' },
    { q: 'What kind of edits can I make?', a: 'You can perform a wide range of edits, including adding or removing objects, changing backgrounds, applying filters, adjusting colors, retouching portraits, and much more. If you can describe it, Nano Banana can likely create it.' },
  ];
  
  const suggestedPrompts = [
      'Change the background to a futuristic cityscape',
      'Add a pirate hat',
      'Make it look like an oil painting',
      'Turn the subject into a cartoon character',
      'Add a magical glowing aura',
      'Change the season to winter with snow',
      'Place a dragon in the sky',
      'Apply a vintage film look',
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="bg-[#0b0b0b] text-gray-300 font-sans antialiased">
       <header className="sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-zinc-800">
            <nav className="container mx-auto px-4 flex items-center justify-between h-16">
                <a href="#" className="flex items-center space-x-2">
                    <LogoIcon />
                    <span className="font-semibold text-lg">Nano Banana</span>
                </a>

                <ul className="hidden md:flex items-center space-x-8">
                    {navLinks.map(link => (
                        <li key={link.href}>
                            <a href={link.href} className="text-gray-300 hover:text-white transition-colors">{link.label}</a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center space-x-4">
                    <div className="relative" ref={langMenuRef}>
                        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
                            <GlobeIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">{currentLang}</span>
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
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm md:hidden">
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
      
      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-24">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">Edit Images with Nano Banana</h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8">
            Edit your photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Upload any picture, describe your changes, and let Nano Banana transform your images in seconds. No design skills required.
          </p>
        </section>

        {/* Editor Section */}
        <section id="editor" className="p-px bg-gradient-to-br from-pink-500/50 via-transparent to-yellow-500/50 rounded-3xl mb-24">
          <div className="bg-[#121212] rounded-[23px] p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Controls Panel */}
                <div className="lg:col-span-4 space-y-4 flex flex-col">
                    {/* Prompt Input */}
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => {
                                if (e.target.value.length <= 2000) {
                                    setPrompt(e.target.value)
                                }
                            }}
                            placeholder="Input prompt here"
                            className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition resize-none h-32"
                            maxLength={2000}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center space-x-2 text-xs text-zinc-400">
                            <span>{prompt.length}/2000</span>
                            <button onClick={handleCopyPrompt} className="hover:text-white transition-colors" aria-label="Copy prompt"><CopyIcon className="w-4 h-4" /></button>
                            <button onClick={() => setPrompt('')} className="hover:text-white transition-colors" aria-label="Clear prompt"><XIcon className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* Suggested Prompts */}
                    <div>
                        <p className="text-sm text-zinc-400 mb-2">✨ Try these ideas:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedPrompts.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPrompt(p)}
                                    className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs hover:bg-zinc-700 transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Ratio */}
                    <div>
                        <label className="text-sm font-medium text-gray-300">Ratio</label>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between bg-[#1c1c1c] border border-zinc-700 rounded-lg p-3">
                                <div className="flex items-center">
                                    <span className="text-sm">Auto Ratio</span>
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
                                className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none bg-no-repeat bg-right-3 disabled:opacity-50 disabled:cursor-not-allowed" 
                                style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em'}}>
                                <option value="1:1">1:1</option>
                                <option value="16:9">16:9</option>
                                <option value="9:16">9:16</option>
                                <option value="4:3">4:3</option>
                                <option value="3:4">3:4</option>
                            </select>
                        </div>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="text-sm font-medium text-gray-300">Images</label>
                        <div onClick={handleFileSelect} className="mt-2 w-full h-32 border-2 border-dashed border-zinc-600 rounded-lg flex items-center justify-center text-center hover:border-zinc-400 cursor-pointer transition-colors bg-black/20">
                            {originalImage ? (
                                <img src={originalImage.dataUrl} alt="uploaded preview" className="max-h-full max-w-full object-contain p-1" />
                            ) : (
                                <p className="text-zinc-400 text-sm">Click / Drag & Drop to Upload</p>
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, image/heic" />
                        </div>
                    </div>

                    <div className="border-t border-zinc-700 !mt-auto"></div>
                    
                    {/* Generate Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !originalImage || !prompt}
                        className="w-full p-3 text-center font-bold text-black bg-gradient-to-r from-pink-500 to-yellow-400 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center text-base"
                    >
                        {isLoading ? (
                            <SpinnerIcon className="w-6 h-6 animate-spin text-black" />
                        ) : (
                            <>
                                Generate Now
                                <span className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-300/50 text-xs font-bold ring-1 ring-inset ring-black/20">40</span>
                            </>
                        )}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center -mt-2">{error}</p>}
                </div>
                
                {/* Center Output Panel */}
                <div className="lg:col-span-8 bg-black rounded-2xl flex items-center justify-center min-h-[40vh] lg:min-h-0 relative overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center text-zinc-400 z-10">
                            <SpinnerIcon className="w-10 h-10 animate-spin text-white" />
                            <p className="mt-2">Generating...</p>
                        </div>
                    )}
                    {!isLoading && editedImage && (
                        <img src={editedImage} alt="Edited result" className="w-full h-full object-contain rounded-2xl" />
                    )}
                    {!isLoading && !editedImage && (
                        <div className="text-center text-zinc-500 z-10">
                            <ImageIcon className="w-16 h-16 mx-auto opacity-30" />
                            <p className="mt-4">Create with Flux AI now!</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </section>


        {/* How It Works Section */}
        <section id="how-it-works" className="mb-24">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Nano Banana - Free AI Image Editor</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="bg-zinc-900 p-8 rounded-xl">
                    <div className="text-2xl font-bold bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4">1</div>
                    <h3 className="text-xl font-semibold mb-2">Upload Your Image</h3>
                    <p className="text-gray-400">Upload any photo—portrait, landscape, or product shot. The editor supports all major file formats.</p>
                </div>
                <div className="bg-zinc-900 p-8 rounded-xl">
                    <div className="text-2xl font-bold bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4">2</div>
                    <h3 className="text-xl font-semibold mb-2">Describe Your Edit</h3>
                    <p className="text-gray-400">Use simple text to describe the changes you want. Remove objects, change backgrounds, add items, and more.</p>
                </div>
                <div className="bg-zinc-900 p-8 rounded-xl">
                    <div className="text-2xl font-bold bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4">3</div>
                    <h3 className="text-xl font-semibold mb-2">Download & Share</h3>
                    <p className="text-gray-400">Download your edited image instantly. Sign up to unlock advanced features and faster workflows.</p>
                </div>
            </div>
        </section>

        {/* Why Use Section */}
        <section id="why-use" className="mb-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why use Krea's Nano Banana image editor?</h2>
            <p className="text-gray-400 mb-6 max-w-3xl">
              AI-powered image editor models like Nano Banana make photo editing accessible to everyone by understanding natural language instructions. With Krea's free Nano Banana editor powered by Gemini 2.5 Flash, you can remove objects, swap backgrounds, combine images, and make complex edits just by pointing and describing what you want. It's intuitive, powerful, and requires no design skills—perfect for quick fixes and creative projects.
            </p>
            <a href="#" className="inline-flex items-center font-semibold text-white hover:text-blue-400 transition-colors group">
              Try the Full Editor
              <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-zinc-900 aspect-square rounded-xl flex flex-col items-center justify-center text-gray-500">
                    <SpinnerIcon className="w-8 h-8 animate-spin" />
                    <span className="text-sm mt-2">Generating</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="w-full bg-zinc-700 rounded-full h-1 mt-4">
                  <div className="bg-green-500 h-1 rounded-full" style={{width: '25%'}}></div>
                </div>
                <div className="flex items-center justify-end space-x-4 mt-3 text-sm text-gray-400">
                  <button className="flex items-center space-x-1 hover:text-white"><RetryIcon className="w-4 h-4" /><span>Retry</span></button>
                  <button className="flex items-center space-x-1 hover:text-white"><span>Reuse parameters</span></button>
                  <button className="flex items-center space-x-1 hover:text-white"><ShareIcon className="w-4 h-4" /><span>Share parameters</span></button>
                  <button className="flex items-center space-x-1 hover:text-white"><XIcon className="w-4 h-4" /><span>Cancel</span></button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-4">Free AI Image Editor. No sign up required.</h3>
              <p className="text-gray-400 mb-6">
                Remove unwanted objects, retouch portraits, swap backgrounds, or combine images—all in one place. Just upload and start editing.
              </p>
              <button className="px-6 py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors self-start">
                Explore other Krea tools
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="mb-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Intuitive, powerful, and free.</h2>
            <p className="text-gray-400 text-lg mb-12">See what others say about Nano Banana.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-zinc-900 p-6 rounded-lg flex flex-col">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, s) => <StarIcon key={s} className="w-5 h-5 text-yellow-400" />)}
                </div>
                <p className="text-gray-300 flex-grow">"{t.text}"</p>
                <div className="flex items-center mt-6">
                  <img src={`https://picsum.photos/seed/${t.name}/40/40`} alt={t.name} className="w-10 h-10 rounded-full" />
                  <span className="ml-4 font-semibold">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="max-w-3xl mx-auto mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-900 rounded-lg">
                <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-center p-6 text-left">
                  <span className="text-lg font-medium">{faq.q}</span>
                  <ChevronDownIcon className={`w-6 h-6 transform transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-gray-400">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        
        {/* CTA */}
        <section className="text-center">
            <div className="bg-zinc-900/50 border-2 border-dashed border-gray-700 rounded-2xl py-16 px-8">
                <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Edit your photos with Nano Banana</h2>
                <p className="text-gray-400 mb-8">Free canvas-based photo editor—no signup, no credit card required.</p>
                <button onClick={() => document.getElementById('editor')?.scrollIntoView({behavior: 'smooth'})} className="px-8 py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors">
                    Get started
                </button>
            </div>
        </section>

      </main>

      <footer className="text-center py-8 mt-16 border-t border-gray-800">
        <p className="text-gray-500">© {new Date().getFullYear()} Nano Banana. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;

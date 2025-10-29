import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ImageFile } from './types';
import { editImage } from './services/geminiService';
import { LogoIcon, UploadIcon, StarIcon, ChevronDownIcon, ArrowRightIcon, SpinnerIcon, RetryIcon, ShareIcon, XIcon, GlobeIcon, MenuIcon } from './components/icons';

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      setEditedImage(null);
      setPrompt('');
      try {
        const imageFile = await fileToImageFile(file);
        setOriginalImage(imageFile);
      } catch (err) {
        setError('Failed to load image. Please try another file.');
        console.error(err);
      } finally {
        setIsLoading(false);
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
      const newImage = await editImage(originalImage.base64, originalImage.mimeType, prompt);
      setEditedImage(newImage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetEditor = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const promptSuggestions = [
    'Add a retro, vintage filter',
    'Change the background to a futuristic city',
    'Make the image black and white',
    'Add a funny hat to the main subject',
    'Turn the photo into an oil painting',
    'Make the colors more vibrant',
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="bg-black text-gray-200 font-sans antialiased">
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
        <section id="editor" className="bg-zinc-900/50 rounded-2xl p-4 md:p-8 mb-24">
          {!originalImage ? (
            <div
              onClick={handleFileSelect}
              className="relative block w-full border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-colors"
            >
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <button
                type="button"
                className="mt-4 relative inline-flex items-center px-8 py-3 border border-transparent shadow-sm text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500"
              >
                Upload Image
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, image/heic" />
              <p className="mt-2 text-xs text-gray-500">.png, .jpeg, .webp, .heic</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-2">Original</h3>
                  <div className="aspect-square w-full bg-zinc-800 rounded-lg overflow-hidden">
                    <img src={originalImage.dataUrl} alt="Original upload" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-2">Edited</h3>
                  <div className="aspect-square w-full bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {isLoading && !editedImage && (
                       <div className="flex flex-col items-center text-gray-400">
                         <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         <p className="mt-2">Generating...</p>
                       </div>
                    )}
                    {editedImage && !isLoading && (
                        <img src={editedImage} alt="Edited result" className="w-full h-full object-contain" />
                    )}
                    {!editedImage && !isLoading && (
                      <div className="text-gray-500">Your edited image will appear here</div>
                    )}
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
              
              <div className="mt-6 flex flex-col md:flex-row gap-4 items-start">
                  <div className="w-full">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Add a pirate hat and an eye-patch"
                      className="w-full bg-zinc-800 border border-gray-700 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      rows={2}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {promptSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setPrompt(suggestion)}
                          className="px-3 py-1 bg-zinc-700 text-sm text-gray-300 rounded-full hover:bg-zinc-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isLoading ? 'Generating...' : 'Generate'}
                  </button>
              </div>
              <div className="mt-4 flex flex-col md:flex-row gap-4">
                <button onClick={resetEditor} className="w-full md:w-auto px-6 py-2 bg-gray-700 text-white font-medium rounded-md hover:bg-gray-600 transition-colors">Start Over</button>
                {editedImage && (
                  <a href={editedImage} download="edited-image.png" className="w-full md:w-auto text-center px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors">Download</a>
                )}
              </div>
            </div>
          )}
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
                <button onClick={() => document.getElementById('editor')?.scrollIntoView()} className="px-8 py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors">
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
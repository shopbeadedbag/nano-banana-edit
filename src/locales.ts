
export type LangCode = 'en' | 'es' | 'fr' | 'pt' | 'ru' | 'ar' | 'id' | 'vn' | 'th';

export interface Translation {
  seoTitle: string;
  seoDesc: string;
  navEditor: string;
  navHow: string;
  navFeatures: string;
  navTrans: string;
  navFaq: string;
  heroTitle: string;
  heroSubtitle: string;
  modeI2I: string;
  modeT2I: string;
  inputPlaceholder: string;
  ratioLabel: string;
  ratioAuto: string;
  uploadLabel: string;
  uploadBtn: string;
  generateBtn: string;
  downloadBtn: string;
  generating: string;
  resultPlaceholder: string;
  // Sections
  howToTitle: string;
  transTitle: string;
  transSubtitle: string;
  featuresTitle: string;
  faqTitle: string;
  faqSubtitle: string;
  footerRights: string;
}

const baseEn: Translation = {
  seoTitle: "Nano Banana - Free AI Image Editor | Edit Photos with Text Prompts",
  seoDesc: "Edit photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Describe changes with text to transform images, create art, and edit professionally without design skills.",
  navEditor: "Editor",
  navHow: "How It Works",
  navFeatures: "Features",
  navTrans: "Transformations",
  navFaq: "FAQ",
  heroTitle: "Edit Images with Nano Banana",
  heroSubtitle: "Edit your photos instantly with Nano Banana, the free AI image editor powered by Gemini 2.5 Flash. Upload any picture, describe your changes, and let Nano Banana transform your images in seconds.",
  modeI2I: "Image to Image",
  modeT2I: "Text to Image",
  inputPlaceholder: "Input prompt here",
  ratioLabel: "Ratio",
  ratioAuto: "Auto Ratio",
  uploadLabel: "Images",
  uploadBtn: "Click / Drag & Drop to Upload",
  generateBtn: "Generate Now",
  downloadBtn: "Download",
  generating: "Generating...",
  resultPlaceholder: "Your generated image will appear here",
  howToTitle: "How to Use Nano Banana AI Image Editor",
  transTitle: "Popular Nano Banana AI Image Transformations",
  transSubtitle: "Explore trending AI-powered photo effects and creative transformations with Nano Banana.",
  featuresTitle: "Nano Banana Conversational AI Photo Editing",
  faqTitle: "Frequently Asked Questions",
  faqSubtitle: "Do you have a question?",
  footerRights: "All rights reserved.",
};

export const locales: Record<LangCode, Translation> = {
  en: baseEn,
  es: {
    ...baseEn,
    seoTitle: "Nano Banana - Editor de Fotos IA Gratis | Edita con Texto",
    seoDesc: "Edita fotos al instante con Nano Banana, el editor de imágenes gratuito con IA. Describe los cambios con texto para transformar imágenes y crear arte sin habilidades de diseño.",
    navEditor: "Editor",
    navHow: "Cómo Funciona",
    navFeatures: "Características",
    navTrans: "Transformaciones",
    heroTitle: "Edita Imágenes con Nano Banana",
    heroSubtitle: "Edita tus fotos al instante con Nano Banana, el editor de imágenes IA gratuito impulsado por Gemini 2.5 Flash. Sube una foto y describe los cambios.",
    modeI2I: "Imagen a Imagen",
    modeT2I: "Texto a Imagen",
    inputPlaceholder: "Escribe tu descripción aquí",
    ratioAuto: "Ratio Automático",
    uploadBtn: "Clic / Arrastrar para Subir",
    generateBtn: "Generar Ahora",
    downloadBtn: "Descargar",
    generating: "Generando...",
    resultPlaceholder: "Tu imagen generada aparecerá aquí",
    howToTitle: "Cómo Usar el Editor de Imágenes Nano Banana",
    transTitle: "Transformaciones Populares de Nano Banana",
    transSubtitle: "Explora efectos fotográficos y transformaciones creativas impulsadas por IA.",
    faqTitle: "Preguntas Frecuentes",
    faqSubtitle: "¿Tienes alguna pregunta?",
    footerRights: "Todos los derechos reservados.",
  },
  fr: {
    ...baseEn,
    seoTitle: "Nano Banana - Éditeur d'Images IA Gratuit | Modifiez vos Photos",
    seoDesc: "Modifiez vos photos instantanément avec Nano Banana, l'éditeur d'images IA gratuit. Décrivez les changements par texte pour transformer des images et créer de l'art.",
    navEditor: "Éditeur",
    navHow: "Comment ça marche",
    navFeatures: "Fonctionnalités",
    navTrans: "Transformations",
    heroTitle: "Modifiez vos Images avec Nano Banana",
    heroSubtitle: "Modifiez vos photos instantanément avec Nano Banana, l'éditeur d'images IA gratuit propulsé par Gemini 2.5 Flash.",
    modeI2I: "Image vers Image",
    modeT2I: "Texte vers Image",
    inputPlaceholder: "Entrez votre prompt ici",
    ratioAuto: "Ratio Auto",
    uploadBtn: "Cliquez / Glissez pour Uploader",
    generateBtn: "Générer Maintenant",
    downloadBtn: "Télécharger",
    generating: "Génération en cours...",
    resultPlaceholder: "Votre image générée apparaîtra ici",
    howToTitle: "Comment Utiliser Nano Banana",
    transTitle: "Transformations Populaires Nano Banana",
    faqTitle: "Foire Aux Questions",
    footerRights: "Tous droits réservés.",
  },
  pt: {
    ...baseEn,
    seoTitle: "Nano Banana - Editor de Imagens IA Grátis | Edite com Texto",
    seoDesc: "Edite fotos instantaneamente com Nano Banana, o editor de imagens IA gratuito. Descreva alterações com texto para transformar imagens.",
    navEditor: "Editor",
    navHow: "Como Funciona",
    navFeatures: "Recursos",
    heroTitle: "Edite Imagens com Nano Banana",
    heroSubtitle: "Edite suas fotos instantaneamente com Nano Banana, o editor de imagens gratuito alimentado pelo Gemini 2.5 Flash.",
    modeI2I: "Imagem para Imagem",
    modeT2I: "Texto para Imagem",
    inputPlaceholder: "Digite seu prompt aqui",
    generateBtn: "Gerar Agora",
    downloadBtn: "Baixar",
    generating: "Gerando...",
    howToTitle: "Como Usar o Nano Banana",
    transTitle: "Transformações Populares",
    faqTitle: "Perguntas Frequentes",
    footerRights: "Todos os direitos reservados.",
  },
  ru: {
    ...baseEn,
    seoTitle: "Nano Banana - Бесплатный ИИ фоторедактор | Редактируйте текстом",
    seoDesc: "Редактируйте фото мгновенно с Nano Banana, бесплатным ИИ редактором. Описывайте изменения текстом, чтобы трансформировать изображения.",
    navEditor: "Редактор",
    navHow: "Как это работает",
    navFeatures: "Функции",
    heroTitle: "Редактируйте изображения с Nano Banana",
    heroSubtitle: "Редактируйте фото мгновенно с Nano Banana, бесплатным ИИ редактором на базе Gemini 2.5 Flash.",
    modeI2I: "Из фото в фото",
    modeT2I: "Текст в фото",
    inputPlaceholder: "Введите запрос здесь",
    generateBtn: "Сгенерировать",
    downloadBtn: "Скачать",
    generating: "Генерация...",
    resultPlaceholder: "Здесь появится ваше изображение",
    howToTitle: "Как использовать Nano Banana",
    transTitle: "Популярные трансформации",
    faqTitle: "Часто задаваемые вопросы",
    footerRights: "Все права защищены.",
  },
  ar: {
    ...baseEn,
    seoTitle: "Nano Banana - محرر صور بالذكاء الاصطناعي مجانًا | عدل الصور بالنص",
    seoDesc: "عدل صورك فورًا باستخدام Nano Banana، محرر الصور المجاني بالذكاء الاصطناعي المدعوم بـ Gemini 2.5 Flash.",
    navEditor: "المحرر",
    navHow: "كيف يعمل",
    navFeatures: "الميزات",
    heroTitle: "عدل الصور مع Nano Banana",
    heroSubtitle: "عدل صورك فورًا باستخدام Nano Banana، محرر الصور المجاني بالذكاء الاصطناعي.",
    modeI2I: "صورة إلى صورة",
    modeT2I: "نص إلى صورة",
    inputPlaceholder: "أدخل الوصف هنا",
    generateBtn: "إنشاء الآن",
    downloadBtn: "تحميل",
    generating: "جاري الإنشاء...",
    resultPlaceholder: "ستظهر صورتك هنا",
    howToTitle: "كيفية استخدام Nano Banana",
    transTitle: "تحويلات شائعة",
    faqTitle: "الأسئلة الشائعة",
    footerRights: "جميع الحقوق محفوظة.",
  },
  id: {
    ...baseEn,
    seoTitle: "Nano Banana - Editor Gambar AI Gratis | Edit Foto dengan Teks",
    seoDesc: "Edit foto secara instan dengan Nano Banana, editor gambar AI gratis yang didukung oleh Gemini 2.5 Flash.",
    navEditor: "Editor",
    heroTitle: "Edit Gambar dengan Nano Banana",
    heroSubtitle: "Edit foto Anda secara instan dengan Nano Banana, editor gambar AI gratis.",
    modeI2I: "Gambar ke Gambar",
    modeT2I: "Teks ke Gambar",
    generateBtn: "Buat Sekarang",
    downloadBtn: "Unduh",
    howToTitle: "Cara Menggunakan Nano Banana",
    faqTitle: "Pertanyaan Umum",
    footerRights: "Hak cipta dilindungi.",
  },
  vn: {
    ...baseEn,
    seoTitle: "Nano Banana - Trình chỉnh sửa ảnh AI miễn phí",
    seoDesc: "Chỉnh sửa ảnh ngay lập tức với Nano Banana, trình chỉnh sửa ảnh AI miễn phí được hỗ trợ bởi Gemini 2.5 Flash.",
    navEditor: "Trình chỉnh sửa",
    heroTitle: "Chỉnh sửa ảnh với Nano Banana",
    heroSubtitle: "Chỉnh sửa ảnh của bạn ngay lập tức với Nano Banana.",
    modeI2I: "Ảnh sang Ảnh",
    modeT2I: "Văn bản sang Ảnh",
    generateBtn: "Tạo Ngay",
    downloadBtn: "Tải xuống",
    howToTitle: "Cách sử dụng Nano Banana",
    faqTitle: "Câu hỏi thường gặp",
    footerRights: "Đã đăng ký bản quyền.",
  },
  th: {
    ...baseEn,
    seoTitle: "Nano Banana - โปรแกรมแก้ไขรูปภาพ AI ฟรี",
    seoDesc: "แก้ไขรูปภาพทันทีด้วย Nano Banana โปรแกรมแก้ไขรูปภาพ AI ฟรีที่ขับเคลื่อนโดย Gemini 2.5 Flash",
    navEditor: "แก้ไข",
    heroTitle: "แก้ไขรูปภาพด้วย Nano Banana",
    heroSubtitle: "แก้ไขรูปภาพของคุณทันทีด้วย Nano Banana",
    modeI2I: "รูปภาพเป็นรูปภาพ",
    modeT2I: "ข้อความเป็นรูปภาพ",
    generateBtn: "สร้างทันที",
    downloadBtn: "ดาวน์โหลด",
    howToTitle: "วิธีใช้ Nano Banana",
    faqTitle: "คำถามที่พบบ่อย",
    footerRights: "สงวนลิขสิทธิ์",
  }
};

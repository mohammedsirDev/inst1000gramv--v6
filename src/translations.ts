import { LanguageConfig, SupportedLanguage } from './types.ts';
import { LANGUAGES, ALL_SUPPORTED_LANGUAGES } from './config/languages.ts';
import { COMMON_TRANSLATIONS } from './translations/commonData.ts';

export { LANGUAGES, ALL_SUPPORTED_LANGUAGES };

export interface FaqItem {
  q: string;
  a: string;
}

export interface TranslationDictionary {
  brandName: string;
  brandTagline: string;
  navReels: string;
  navVideo: string;
  navPhoto: string;
  navStories: string;
  navHighlights: string;
  navIgtv: string;
  navAdmin: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  inputPlaceholder: string;
  pasteBtn: string;
  downloadBtn: string;
  resolvingText: string;
  processingStream: string;
  reliableNetworkBadge: string;
  retryAttempt: string;
  downloadSuccess: string;
  readyInHD: string;
  downloadFileBtn: string;
  downloadAllBtn: string;
  audioOnlyBtn: string;
  featuresTitle: string;
  featuresSubtitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
  howToTitle: string;
  howToSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  faqTitle: string;
  faqSubtitle: string;
  faqs: FaqItem[];
  pseoSectionTitle: string;
  pseoSectionSubtitle: string;
  viewAllSitemaps: string;
  footerRights: string;
  footerDisclaimer: string;
  fastSpeedNotice: string;
  sslSecureNotice: string;
  quickTestLabel: string;
  secretShortcutBadge: string;
  secretShortcutSub: string;
  secretShortcutTitle: string;
  secretShortcutDesc: string;
  secretShortcutOriginal: string;
  secretShortcutModified: string;
  mobileOptimizedTitle: string;
  mobileOptimizedDesc: string;
  desktopOptimizedTitle: string;
  desktopOptimizedDesc: string;
  allToolsTitle: string;
  allToolsDesc: string;
  // Dynamic UI & Downloader keys
  carouselSlides: string;
  storiesList: string;
  highlightItems: string;
  downloadSlide: string;
  downloadStory: string;
  downloadHighlight: string;
  downloadVideo: string;
  downloadPhoto: string;
  downloadZip: string;
  downloadAudio: string;
  downloading: string;
  downloadComplete: string;
  savingToDevice: string;
  scanQrCode: string;
  directLink: string;
  downloadProgressLabel: string;
  anonymousBadge: string;
  browserDownloadFallback: string;
}

// Multi-language custom content dictionaries
interface ExtendedLanguageContent {
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  faqs: FaqItem[];
  secretShortcutSub: string;
  secretShortcutOriginal: string;
  secretShortcutModified: string;
  mobileOptimizedTitle: string;
  mobileOptimizedDesc: string;
  desktopOptimizedTitle: string;
  desktopOptimizedDesc: string;
  pseoSectionTitle: string;
  pseoSectionSubtitle: string;
  viewAllSitemaps: string;
  carouselSlides: string;
  storiesList: string;
  highlightItems: string;
  downloadSlide: string;
  downloadStory: string;
  downloadHighlight: string;
  downloadVideo: string;
  downloadPhoto: string;
  downloadZip: string;
  downloadAudio: string;
  downloading: string;
  downloadComplete: string;
  savingToDevice: string;
  scanQrCode: string;
  directLink: string;
  downloadProgressLabel: string;
  anonymousBadge: string;
  browserDownloadFallback: string;
}

const EXTENDED_TRANSLATIONS: Partial<Record<SupportedLanguage, ExtendedLanguageContent>> = {
  ar: {
    feature1Title: 'بدون أي تقليل للجودة (1080p)',
    feature1Desc: 'نستخرج ملفات الفيديو الأصلية بصيغة MP4 وبدقة 1080p بمعدل 60 إطاراً في الثانية والصور بأعلى دقة متوفرة.',
    feature2Title: 'مشاهدة وتحميل مجهول 100%',
    feature2Desc: 'حمل وشاهد القصص والهايلايت والريلز بسرية تامة دون إشعار صاحب الحساب ودون الحاجة لتسجيل الدخول.',
    feature3Title: 'ثبات فائق وسرعة مضاعفة',
    feature3Desc: 'خوادم سحابية متعددة لتسريع تحميل الفيديوهات والصور حتى على شبكات الهاتف المتذبذبة.',
    feature4Title: 'خالٍ تماماً من العلامات المائية',
    feature4Desc: 'احصل على المحتوى الأصلي نقياً دون شعارات مضافة أو إعلانات مزعجة مضللة.',
    step1Title: '1. انسخ رابط المنشور',
    step1Desc: 'افتح تطبيق انستقرام أو المتصفح، واضغط على أيقونة المشاركة واختر "نسخ الرابط".',
    step2Title: '2. الصق الرابط في insta1000gram',
    step2Desc: 'الصق الرابط المنسوخ في حقل البحث بالأعلى ثم اضغط على زر "جلب وتحميل".',
    step3Title: '3. احفظ الملف على جهازك',
    step3Desc: 'اختر الجودة المفضلة لك وسيتم حفظ الملف فوراً في ألبوم الصور أو التنزيلات.',
    faqs: [
      {
        q: 'هل موقع insta1000gram مجاني تماماً؟',
        a: 'نعم، خدمة insta1000gram مجانية 100% بدون أي حدود لعدد التحميلات وبدون الحاجة لإنشاء حساب.',
      },
      {
        q: 'هل يتم تحميل ريلز انستقرام بأعلى دقة 1080p؟',
        a: 'نعم، يسحب الموقع الفيديو بدقة 1080p الأصلية بمعدل 60 إطاراً وصوت استريو نقي دون أي ضغط.',
      },
      {
        q: 'هل يمكنني تحميل الستوري والهايلايت بدون علم صاحب الحساب؟',
        a: 'نعم، التحميل يتم بسرية تامة ومجهول الهوية 100% دون أن يظهر اسمك في قائمة المشاهدين.',
      },
      {
        q: 'ما هي خدعة رابط 1000 السريع؟',
        a: 'فقط أضف الرقم 1000 إلى رابط إنستغرام ليصبح insta1000gram.com وسيفتح التحميل فوراً!',
      },
    ],
    secretShortcutSub: 'أسرع طريقة للتحميل مباشرة من شريط العناوين',
    secretShortcutOriginal: 'الرابط الأصلي:',
    secretShortcutModified: 'أضف "1000" ثم اضغط Enter:',
    mobileOptimizedTitle: 'مُحسّن للهواتف الذكية (iOS و Android)',
    mobileOptimizedDesc: 'متوافق بالكامل مع سفاري وكروم للحفظ المباشر في ألبوم الكاميرا أو التنزيلات بدون أي تطبيقات.',
    desktopOptimizedTitle: 'تسريع التحميل للكمبيوتر (ويندوز وماك)',
    desktopOptimizedDesc: 'سرعات تنزيل متعددة القنوات تصل إلى أقصى سرعة اتصال بالإنترنت لديك.',
    pseoSectionTitle: 'فهرس أدوات التنزيل المتخصصة',
    pseoSectionSubtitle: 'استكشف كافة أدوات التحميل المتخصصة للريلز والفيديوهات والقصص والصور والهايلايت.',
    viewAllSitemaps: 'عرض الفهرس',
    carouselSlides: 'شرائح الألبوم المتعدد',
    storiesList: 'قائمة القصص',
    highlightItems: 'عناصر الهايلايت',
    downloadSlide: 'تحميل الشريحة',
    downloadStory: 'تحميل الستوري',
    downloadHighlight: 'تحميل الهايلايت',
    downloadVideo: 'تحميل الفيديو (MP4)',
    downloadPhoto: 'تحميل الصورة (JPG)',
    downloadZip: 'تحميل جميع العناصر (ملف مضغوط ZIP)',
    downloadAudio: 'تحميل الصوت فقط (MP3)',
    downloading: 'جاري التحميل...',
    downloadComplete: 'تم التحميل بنجاح!',
    savingToDevice: 'جاري الحفظ على جهازك...',
    scanQrCode: 'امسح رمز QR للتحميل المباشر على الهاتف',
    directLink: 'رابط مباشر بديل',
    downloadProgressLabel: 'شريط تقدم التحميل',
    anonymousBadge: 'الوضع المجهول مفعّل',
    browserDownloadFallback: 'أو انقر هنا للتحميل المباشر في المتصفح',
  },
  es: {
    feature1Title: 'Cero Pérdida de Calidad (1080p HD)',
    feature1Desc: 'Extracción directa de transmisiones CDN manteniendo el video original de alta tasa de bits y fotos en máxima resolución.',
    feature2Title: '100% Anónimo y Privado',
    feature2Desc: 'Mira y descarga stories, reels y destacados de forma totalmente discreta sin inicio de sesión ni notificaciones.',
    feature3Title: 'Red Rápida y Fiable',
    feature3Desc: 'Servidores proxy redundantes que garantizan descargas estables y veloces en cualquier conexión.',
    feature4Title: 'Sin Marcas de Agua',
    feature4Desc: 'Archivos MP4 y JPG limpios sin logotipos, marcas añadidas ni compresión destructiva.',
    step1Title: '1. Copia el enlace de Instagram',
    step1Desc: 'Abre Instagram en la app o navegador, pulsa compartir y selecciona "Copiar enlace".',
    step2Title: '2. Pégalo en insta1000gram',
    step2Desc: 'Pega la URL en el buscador superior y haz clic en "Descargar".',
    step3Title: '3. Guarda en tu dispositivo',
    step3Desc: 'Elige tu calidad preferida y guárdalo en tu galería o carpeta de descargas.',
    faqs: [
      {
        q: '¿Es insta1000gram completamente gratuito?',
        a: 'Sí, insta1000gram es 100% gratis con descargas ilimitadas y sin necesidad de crear cuenta.',
      },
      {
        q: '¿Se descargan los Reels en calidad original?',
        a: 'Sí, obtenemos el archivo original en MP4 1080p a 60fps con audio estéreo sin recomprimir.',
      },
      {
        q: '¿Puedo descargar historias y destacados de forma anónima?',
        a: 'Sí. Las solicitudes se realizan mediante servidores proxy seguros sin enviar tu identidad.',
      },
      {
        q: '¿Cómo funciona el atajo del 1000 en la URL?',
        a: 'Simplemente cambia instagram.com por insta1000gram.com en tu navegador para descargar al instante.',
      },
    ],
    secretShortcutSub: 'La forma más rápida de descargar directamente desde la barra de direcciones',
    secretShortcutOriginal: 'Enlace original:',
    secretShortcutModified: 'Añade "1000" y pulsa Enter:',
    mobileOptimizedTitle: 'Optimizado para iPhone y Android',
    mobileOptimizedDesc: 'Guarda directamente en tu carrete en Safari o Chrome sin necesidad de aplicaciones.',
    desktopOptimizedTitle: 'Descargas Rápidas para PC y Mac',
    desktopOptimizedDesc: 'Canales paralelos de alta velocidad para descargar al instante en computadoras de escritorio.',
    pseoSectionTitle: 'Directorio de Descargadores Especializados',
    pseoSectionSubtitle: 'Explora descargadores optimizados para Reels, Stories, Fotos, Videos y Destacados.',
    viewAllSitemaps: 'Ver directorio',
    carouselSlides: 'Diapositivas del carrusel',
    storiesList: 'Lista de historias',
    highlightItems: 'Elementos destacados',
    downloadSlide: 'Descargar diapositiva',
    downloadStory: 'Descargar historia',
    downloadHighlight: 'Descargar destacado',
    downloadVideo: 'Descargar video (MP4)',
    downloadPhoto: 'Descargar imagen (JPG)',
    downloadZip: 'Descargar todo el álbum (.ZIP)',
    downloadAudio: 'Solo audio (MP3)',
    downloading: 'Descargando...',
    downloadComplete: '¡Descarga completada!',
    savingToDevice: 'Guardando en tu dispositivo...',
    scanQrCode: 'Escanea el código QR para descargar en el móvil',
    directLink: 'Enlace directo alternativo',
    downloadProgressLabel: 'Progreso de descarga',
    anonymousBadge: 'Modo anónimo activo',
    browserDownloadFallback: 'O haz clic aquí para descargar directamente en el navegador',
  },
  fr: {
    feature1Title: 'Qualité 1080p Full HD d’Origine',
    feature1Desc: 'Extraction directe depuis les serveurs CDN conservant le débit binaire maximal et la résolution native.',
    feature2Title: '100% Anonyme et Sécurisé',
    feature2Desc: 'Regardez et téléchargez des stories, reels et highlights sans compte et sans laisser de trace.',
    feature3Title: 'Réseau Edge Haute Vitesse',
    feature3Desc: 'Téléchargements ultra-rapides et reprise automatique sur les connexions mobiles.',
    feature4Title: 'Sans Filigrane ni Logo',
    feature4Desc: 'Fichiers MP4 et JPG originaux sans aucun logo superposé ni compression dégradante.',
    step1Title: '1. Copiez le lien Instagram',
    step1Desc: 'Ouvrez Instagram, appuyez sur l’icône de partage et sélectionnez "Copier le lien".',
    step2Title: '2. Collez sur insta1000gram',
    step2Desc: 'Collez l’URL dans le champ ci-dessus puis cliquez sur "Télécharger".',
    step3Title: '3. Enregistrez sur votre appareil',
    step3Desc: 'Sélectionnez la qualité désirée pour sauvegarder le fichier dans vos photos ou téléchargements.',
    faqs: [
      {
        q: 'insta1000gram est-il gratuit ?',
        a: 'Oui, le service est 100% gratuit, sans limite de téléchargement et sans inscription.',
      },
      {
        q: 'Les Reels sont-ils en qualité maximale ?',
        a: 'Oui, nous récupérons le flux MP4 original 1080p 60fps avec l’audio stéréo natif.',
      },
      {
        q: 'Le téléchargement des stories est-il anonyme ?',
        a: 'Absolument. Votre profil n’apparaît jamais dans la liste des spectateurs de la story.',
      },
      {
        q: 'Comment fonctionne le raccourci 1000 ?',
        a: 'Remplacez instagram.com par insta1000gram.com dans la barre d’adresse de votre navigateur.',
      },
    ],
    secretShortcutSub: 'La méthode la plus rapide pour télécharger via la barre d’adresse',
    secretShortcutOriginal: 'Lien original :',
    secretShortcutModified: 'Ajoutez "1000" et appuyez sur Entrée :',
    mobileOptimizedTitle: 'Optimisé pour iPhone et Android',
    mobileOptimizedDesc: 'Enregistrez directement dans votre galerie sous Safari ou Chrome sans application.',
    desktopOptimizedTitle: 'Téléchargements Rapides sur PC et Mac',
    desktopOptimizedDesc: 'Flux haute vitesse pour un enregistrement instantané sur ordinateur.',
    pseoSectionTitle: 'Répertoire des Outils de Téléchargement',
    pseoSectionSubtitle: 'Découvrez nos outils spécialisés pour Reels, Stories, Photos, Vidéos et Highlights.',
    viewAllSitemaps: 'Voir le plan',
    carouselSlides: 'Diapositives du carrousel',
    storiesList: 'Liste des stories',
    highlightItems: 'Éléments à la une',
    downloadSlide: 'Télécharger la diapositive',
    downloadStory: 'Télécharger la story',
    downloadHighlight: 'Télécharger l’élément à la une',
    downloadVideo: 'Télécharger la vidéo (MP4)',
    downloadPhoto: 'Télécharger l’image (JPG)',
    downloadZip: 'Tout télécharger (.ZIP)',
    downloadAudio: 'Audio uniquement (MP3)',
    downloading: 'Téléchargement en cours...',
    downloadComplete: 'Téléchargement terminé !',
    savingToDevice: 'Enregistrement sur votre appareil...',
    scanQrCode: 'Scannez le QR Code pour télécharger sur mobile',
    directLink: 'Lien miroir direct',
    downloadProgressLabel: 'Progression du téléchargement',
    anonymousBadge: 'Mode anonyme actif',
    browserDownloadFallback: 'Ou cliquez ici pour télécharger directement dans le navigateur',
  },
  de: {
    feature1Title: 'Kein Qualitätsverlust (1080p Full HD)',
    feature1Desc: 'Direkter CDN-Stream garantiert höchste Bitrate, 60fps und kristallklare Originalbilder.',
    feature2Title: '100% Anonym & Sicher',
    feature2Desc: 'Stories, Reels und Highlights diskret ansehen und herunterladen ohne Login oder Profilspuren.',
    feature3Title: 'Schnell & Zuverlässig',
    feature3Desc: 'Modernste Server-Relays für ultraschnelle Downloads auf allen Geräten.',
    feature4Title: 'Ohne Wasserzeichen',
    feature4Desc: 'Reine MP4- und JPG-Dateien ohne störende Logos oder künstliche Komprimierung.',
    step1Title: '1. Instagram-Link kopieren',
    step1Desc: 'Öffne Instagram, tippe auf Teilen und wähle "Link kopieren".',
    step2Title: '2. Bei insta1000gram einfügen',
    step2Desc: 'Füge den Link oben in das Eingabefeld ein und klicke auf "Herunterladen".',
    step3Title: '3. Datei speichern',
    step3Desc: 'Wähle dein bevorzugtes Format und speichere das Video oder Foto auf deinem Gerät.',
    faqs: [
      {
        q: 'Ist insta1000gram kostenlos?',
        a: 'Ja, insta1000gram ist 100% kostenlos und ohne Beschränkungen nutzbar.',
      },
      {
        q: 'Werden Reels in Full HD heruntergeladen?',
        a: 'Ja, wir extrahieren das originale MP4-Video in 1080p Full HD mit Stereoton.',
      },
      {
        q: 'Kann ich Stories anonym herunterladen?',
        a: 'Ja, der Profilinhaber erfährt zu keinem Zeitpunkt, dass du die Story gesehen hast.',
      },
      {
        q: 'Wie funktioniert der 1000-Trick?',
        a: 'Ersetze einfach instagram.com durch insta1000gram.com in der Adresszeile.',
      },
    ],
    secretShortcutSub: 'Der schnellste Weg zum Download über die Adresszeile',
    secretShortcutOriginal: 'Original-Link:',
    secretShortcutModified: 'Füge "1000" hinzu und drücke Enter:',
    mobileOptimizedTitle: 'Optimiert für iOS & Android',
    mobileOptimizedDesc: 'Direkt in Safari oder Chrome in die Fotogalerie speichern ohne App-Installation.',
    desktopOptimizedTitle: 'Highspeed für PC & Mac',
    desktopOptimizedDesc: 'Parallele Datenströme für blitzschnelle Downloads am Desktop.',
    pseoSectionTitle: 'Verzeichnis aller Downloader',
    pseoSectionSubtitle: 'Entdecke spezialisierte Downloader für Reels, Stories, Fotos und Highlights.',
    viewAllSitemaps: 'Übersicht anzeigen',
    carouselSlides: 'Karussell-Bilder & Videos',
    storiesList: 'Story-Liste',
    highlightItems: 'Highlight-Elemente',
    downloadSlide: 'Objekt herunterladen',
    downloadStory: 'Story herunterladen',
    downloadHighlight: 'Highlight herunterladen',
    downloadVideo: 'Video herunterladen (MP4)',
    downloadPhoto: 'Foto herunterladen (JPG)',
    downloadZip: 'Alles als ZIP herunterladen',
    downloadAudio: 'Nur Audio (MP3)',
    downloading: 'Wird heruntergeladen...',
    downloadComplete: 'Download abgeschlossen!',
    savingToDevice: 'Wird auf dem Gerät gespeichert...',
    scanQrCode: 'QR-Code scannen für Smartphone-Download',
    directLink: 'Direkter Mirror-Link',
    downloadProgressLabel: 'Download-Fortschritt',
    anonymousBadge: 'Anonym-Modus aktiv',
    browserDownloadFallback: 'Oder hier klicken zum direkten Download im Browser',
  },
  it: {
    feature1Title: 'Qualità Originale 1080p Full HD',
    feature1Desc: 'Estrazione diretta dal server Instagram senza compressione per video a 60fps e foto ad altissima definizione.',
    feature2Title: '100% Anonimo e Sicuro',
    feature2Desc: 'Guarda e scarica storie, reel e contenuti in evidenza senza lasciare traccia e senza account.',
    feature3Title: 'Connessione Veloce e Stabile',
    feature3Desc: 'Server ad alta velocità per scaricare file pesanti in pochi istanti su qualsiasi connessione.',
    feature4Title: 'Senza Nessun Watermark',
    feature4Desc: 'Download puliti in formato MP4 e JPG senza loghi o marchi applicati.',
    step1Title: '1. Copia il link di Instagram',
    step1Desc: 'Apri Instagram, tocca l’icona di condivisione e seleziona "Copia link".',
    step2Title: '2. Incolla su insta1000gram',
    step2Desc: 'Incolla il link nella barra in alto e clicca su "Scarica".',
    step3Title: '3. Salva sul tuo dispositivo',
    step3Desc: 'Scegli la risoluzione desiderata e salva nella galleria o nei download.',
    faqs: [
      {
        q: 'insta1000gram è gratuito?',
        a: 'Sì, è gratis al 100% con download illimitati e senza registrazione.',
      },
      {
        q: 'I Reel vengono salvati in alta risoluzione?',
        a: 'Sì, scarichiamo il file video originale in 1080p con audio nitido.',
      },
      {
        q: 'Il download delle storie è invisibile?',
        a: 'Sì, il proprietario del profilo non saprà mai che hai visualizzato o salvato la storia.',
      },
      {
        q: 'Come funziona la scorciatoia del 1000?',
        a: 'Aggiungi 1000 a instagram.com facendolo diventare insta1000gram.com nella barra del browser.',
      },
    ],
    secretShortcutSub: 'Il modo più rapido per scaricare dalla barra degli indirizzi',
    secretShortcutOriginal: 'Link originale:',
    secretShortcutModified: 'Aggiungi "1000" e premi Invio:',
    mobileOptimizedTitle: 'Ottimizzato per Smartphone',
    mobileOptimizedDesc: 'Salva subito nella galleria su Safari (iPhone) o Chrome (Android) senza installare app.',
    desktopOptimizedTitle: 'Download ad Alta Velocità per PC & Mac',
    desktopOptimizedDesc: 'Supporto streaming ultra-veloce per computer desktop.',
    pseoSectionTitle: 'Elenco Strumenti di Download',
    pseoSectionSubtitle: 'Scopri i downloader dedicati per Reel, Storie, Foto, Video e Contenuti in Evidenza.',
    viewAllSitemaps: 'Visualizza directory',
    carouselSlides: 'Elementi del carosello',
    storiesList: 'Elenco storie',
    highlightItems: 'Elementi in evidenza',
    downloadSlide: 'Scarica elemento',
    downloadStory: 'Scarica storia',
    downloadHighlight: 'Scarica contenuto in evidenza',
    downloadVideo: 'Scarica video (MP4)',
    downloadPhoto: 'Scarica immagine (JPG)',
    downloadZip: 'Scarica tutto (.ZIP)',
    downloadAudio: 'Solo audio (MP3)',
    downloading: 'Download in corso...',
    downloadComplete: 'Download completato!',
    savingToDevice: 'Salvataggio sul dispositivo...',
    scanQrCode: 'Scansiona il codice QR per scaricare su mobile',
    directLink: 'Link mirror diretto',
    downloadProgressLabel: 'Avanzamento del download',
    anonymousBadge: 'Modalità anonima attiva',
    browserDownloadFallback: 'Oppure clicca qui per scaricare direttamente nel browser',
  },
  pt: {
    feature1Title: 'Sem Perda de Qualidade (1080p HD)',
    feature1Desc: 'Extração direta dos servidores do Instagram garantindo vídeo em 60fps e fotos na resolução máxima.',
    feature2Title: '100% Anônimo e Privado',
    feature2Desc: 'Assista e baixe Stories, Reels e Destaques sem login e sem que ninguém saiba.',
    feature3Title: 'Super Rápido e Estável',
    feature3Desc: 'Servidores de alto desempenho para downloads instantâneos em conexões móveis ou Wi-Fi.',
    feature4Title: 'Livre de Marcas d’Água',
    feature4Desc: 'Arquivos MP4 e JPG originais e limpos sem logotipos indesejados.',
    step1Title: '1. Copie o link do Instagram',
    step1Desc: 'Abra o Instagram no aplicativo ou navegador, clique em compartilhar e em "Copiar link".',
    step2Title: '2. Cole no insta1000gram',
    step2Desc: 'Cole o link no campo acima e clique em "Baixar".',
    step3Title: '3. Salve no seu aparelho',
    step3Desc: 'Escolha a qualidade e salve direto na sua galeria ou pasta de downloads.',
    faqs: [
      {
        q: 'O insta1000gram é gratuito?',
        a: 'Sim, o serviço é 100% gratuito, sem limites de download e sem cadastro.',
      },
      {
        q: 'Os Reels são baixados em Full HD?',
        a: 'Sim, extraímos o arquivo MP4 original em 1080p com áudio estéreo.',
      },
      {
        q: 'É seguro e anônimo baixar Stories?',
        a: 'Sim, o criador do conteúdo nunca saberá que você visualizou ou baixou o Story.',
      },
      {
        q: 'Como funciona o atalho do 1000?',
        a: 'Basta colocar 1000 no meio do link (insta1000gram.com) na barra de endereços.',
      },
    ],
    secretShortcutSub: 'A forma mais rápida de baixar direto pela barra de endereços',
    secretShortcutOriginal: 'Link original:',
    secretShortcutModified: 'Adicione "1000" e pressione Enter:',
    mobileOptimizedTitle: 'Otimizado para iPhone e Android',
    mobileOptimizedDesc: 'Salve na sua galeria no Safari ou Chrome sem precisar instalar aplicativos.',
    desktopOptimizedTitle: 'Downloads Rápidos no Computador',
    desktopOptimizedDesc: 'Velocidade máxima em conexões de alta performance no Windows e Mac.',
    pseoSectionTitle: 'Diretório de Ferramentas de Download',
    pseoSectionSubtitle: 'Confira todas as ferramentas para Reels, Stories, Fotos, Vídeos e Destaques.',
    viewAllSitemaps: 'Ver diretório',
    carouselSlides: 'Itens do carrossel',
    storiesList: 'Lista de stories',
    highlightItems: 'Itens em destaque',
    downloadSlide: 'Baixar item',
    downloadStory: 'Baixar story',
    downloadHighlight: 'Baixar destaque',
    downloadVideo: 'Baixar vídeo (MP4)',
    downloadPhoto: 'Baixar foto (JPG)',
    downloadZip: 'Baixar tudo (.ZIP)',
    downloadAudio: 'Apenas áudio (MP3)',
    downloading: 'Baixando...',
    downloadComplete: 'Download concluído!',
    savingToDevice: 'Salvando no seu dispositivo...',
    scanQrCode: 'Escanear QR Code para baixar no celular',
    directLink: 'Link espelho direto',
    downloadProgressLabel: 'Progresso do download',
    anonymousBadge: 'Modo anônimo ativo',
    browserDownloadFallback: 'Ou clique aqui para baixar diretamente no navegador',
  },
  tr: {
    feature1Title: 'Orijinal 1080p Full HD Kalite',
    feature1Desc: 'Instagram sunucularından doğrudan çekilerek 60fps yüksek kaliteli MP4 ve orijinal netlikte fotoğraflar sunar.',
    feature2Title: '%100 Gizli ve Anonim',
    feature2Desc: 'Hikaye, Öne Çıkanlar ve Reels içeriklerini hesap girişi yapmadan ve karşı tarafa bildirim gitmeden indirin.',
    feature3Title: 'Yüksek Hızlı Bağlantı',
    feature3Desc: 'Kesintisiz ve hızlı indirme sunucuları ile mobil ağlarda bile maksimum hız.',
    feature4Title: 'Filigransız ve Logosuz',
    feature4Desc: 'Üzerine herhangi bir reklam veya logo eklenmemiş tertemiz orijinal medya dosyaları.',
    step1Title: '1. Instagram Bağlantısını Kopyala',
    step1Desc: 'Instagram uygulamasında veya tarayıcıda paylaş simgesine dokunup "Bağlantıyı Kopyala"yı seçin.',
    step2Title: '2. insta1000gram’a Yapıştır',
    step2Desc: 'Kopyaladığınız bağlantıyı yukarıdaki kutuya yapıştırıp "İndir" butonuna tıklayın.',
    step3Title: '3. Cihazınıza Kaydedin',
    step3Desc: 'İstediğiniz kaliteyi seçerek videoyu veya fotoğrafı doğrudan galerinize indirin.',
    faqs: [
      {
        q: 'insta1000gram ücretsiz mi?',
        a: 'Evet, hiçbir ücret ödemeden ve hesap açmadan sınırsız olarak kullanabilirsiniz.',
      },
      {
        q: 'Reels videoları 1080p kalitesinde mi indirilir?',
        a: 'Evet, Instagram’daki en yüksek çözünürlüklü 1080p orijinal MP4 dosyası indirilir.',
      },
      {
        q: 'Hikaye ve Öne Çıkanları gizlice indirebilir miyim?',
        a: 'Evet, izleme listenizde adınız görünmez, %100 anonim olarak indirebilirsiniz.',
      },
      {
        q: '1000 kısayolu nasıl çalışır?',
        a: 'Tarayıcınızdaki Instagram linkine 1000 ekleyip insta1000gram.com yaparak anında indirebilirsiniz.',
      },
    ],
    secretShortcutSub: 'Adres çubuğundan doğrudan indirmenin en hızlı yolu',
    secretShortcutOriginal: 'Orijinal bağlantı:',
    secretShortcutModified: '"1000" ekleyin ve Enter’a basın:',
    mobileOptimizedTitle: 'Telefonlar İçin Optimize Edildi',
    mobileOptimizedDesc: 'Uygulama yüklemeden Safari ve Chrome üzerinden doğrudan galerinize kaydedin.',
    desktopOptimizedTitle: 'Bilgisayar İçin Hızlı İndirme',
    desktopOptimizedDesc: 'Windows ve Mac bilgisayarlarda yüksek hızlı paralel indirme desteği.',
    pseoSectionTitle: 'Tüm İndirme Araçları Dizini',
    pseoSectionSubtitle: 'Reels, Hikaye, Fotoğraf, Video ve Öne Çıkanlar için özel indirme araçlarını keşfedin.',
    viewAllSitemaps: 'Dizini görüntüle',
    carouselSlides: 'Çoklu gönderi slaytları',
    storiesList: 'Hikaye listesi',
    highlightItems: 'Öne çıkan öğeleri',
    downloadSlide: 'Öğeyi İndir',
    downloadStory: 'Hikayeyi İndir',
    downloadHighlight: 'Öne Çıkanı İndir',
    downloadVideo: 'Videoyu İndir (MP4)',
    downloadPhoto: 'Fotoğrafı İndir (JPG)',
    downloadZip: 'Tümünü İndir (.ZIP)',
    downloadAudio: 'Yalnızca Ses (MP3)',
    downloading: 'İndiriliyor...',
    downloadComplete: 'İndirme tamamlandı!',
    savingToDevice: 'Cihazınıza kaydediliyor...',
    scanQrCode: 'Telefonda indirmek için QR kodu tarayın',
    directLink: 'Doğrudan ayna bağlantısı',
    downloadProgressLabel: 'İndirme İlerlemesi',
    anonymousBadge: 'Anonim Mod Etkin',
    browserDownloadFallback: 'Veya tarayıcıda doğrudan indirmek için buraya tıklayın',
  },
  ru: {
    feature1Title: 'Без потери качества (1080p HD)',
    feature1Desc: 'Прямая загрузка с серверов Instagram сохраняет видео 60fps и фото в максимальном разрешении.',
    feature2Title: '100% Анонимно и Безопасно',
    feature2Desc: 'Смотрите и скачивайте истории, Reels и хайлайтс без входа в аккаунт и без уведомлений автору.',
    feature3Title: 'Высокая Скорость Загрузки',
    feature3Desc: 'Отказоустойчивые серверы для быстрой и стабильной загрузки даже при слабом интернете.',
    feature4Title: 'Без Водяных Знаков',
    feature4Desc: 'Чистые файлы MP4 и JPG без сторонних логотипов и сжатия.',
    step1Title: '1. Скопируйте ссылку Instagram',
    step1Desc: 'В приложении или браузере нажмите "Поделиться" и выберите "Копировать ссылку".',
    step2Title: '2. Вставьте в insta1000gram',
    step2Desc: 'Вставьте ссылку в поле выше и нажмите кнопку "Скачать".',
    step3Title: '3. Сохраните на устройство',
    step3Desc: 'Выберите нужное качество, и файл сохранится в галерею или папку загрузок.',
    faqs: [
      {
        q: 'insta1000gram бесплатный?',
        a: 'Да, сервис абсолютно бесплатен, без ограничений по скачиваниям и без регистрации.',
      },
      {
        q: 'В каком качестве скачиваются Reels?',
        a: 'Мы загружаем оригинальный файл MP4 в разрешении 1080p Full HD со стереозвуком.',
      },
      {
        q: 'Скачивание историй действительно анонимно?',
        a: 'Да, ваше имя никогда не появится в списке просмотров автора.',
      },
      {
        q: 'Как работает ссылка со значением 1000?',
        a: 'Просто замените instagram.com на insta1000gram.com в адресной строке для мгновенного скачивания.',
      },
    ],
    secretShortcutSub: 'Самый быстрый способ скачивания через адресную строку',
    secretShortcutOriginal: 'Оригинальная ссылка:',
    secretShortcutModified: 'Добавьте "1000" и нажмите Enter:',
    mobileOptimizedTitle: 'Оптимизировано для Смартфонов',
    mobileOptimizedDesc: 'Сохраняйте прямо в галерею через Safari или Chrome без установки приложений.',
    desktopOptimizedTitle: 'Высокая Скорость на Компьютере',
    desktopOptimizedDesc: 'Многопоточная загрузка на Windows, macOS и Linux.',
    pseoSectionTitle: 'Каталог Инструментов Загрузки',
    pseoSectionSubtitle: 'Специальные загрузчики для Reels, Историй, Фото, Видео и Хайлайтс.',
    viewAllSitemaps: 'Посмотреть каталог',
    carouselSlides: 'Слайды карусели',
    storiesList: 'Список историй',
    highlightItems: 'Элементы хайлайтс',
    downloadSlide: 'Скачать слайд',
    downloadStory: 'Скачать историю',
    downloadHighlight: 'Скачать хайлайтс',
    downloadVideo: 'Скачать видео (MP4)',
    downloadPhoto: 'Скачать фото (JPG)',
    downloadZip: 'Скачать всё архивом (.ZIP)',
    downloadAudio: 'Только аудио (MP3)',
    downloading: 'Загрузка...',
    downloadComplete: 'Загрузка завершена!',
    savingToDevice: 'Сохранение на устройство...',
    scanQrCode: 'Отсканируйте QR-код для загрузки на телефон',
    directLink: 'Прямая ссылка-зеркало',
    downloadProgressLabel: 'Прогресс загрузки',
    anonymousBadge: 'Анонимный режим включен',
    browserDownloadFallback: 'Или нажмите здесь для прямой загрузки в браузере',
  },
  id: {
    feature1Title: 'Kualitas Asli 1080p Full HD',
    feature1Desc: 'Ekstraksi langsung dari server Instagram menjaga kualitas video 60fps dan foto resolusi penuh.',
    feature2Title: '100% Anonim & Aman',
    feature2Desc: 'Tonton dan unduh Story, Reels, dan Sorotan tanpa login dan tanpa diketahui pemilik akun.',
    feature3Title: 'Cepat & Stabil',
    feature3Desc: 'Server berkecepatan tinggi memastikan proses unduh berjalan lancar di segala jaringan.',
    feature4Title: 'Tanpa Watermark',
    feature4Desc: 'File MP4 dan JPG asli tanpa watermark, logo tambahan, atau kompresi rusak.',
    step1Title: '1. Salin Tautan Instagram',
    step1Desc: 'Buka Instagram, ketuk ikon bagikan lalu pilih "Salin tautan".',
    step2Title: '2. Tempel di insta1000gram',
    step2Desc: 'Tempel tautan ke kotak di atas lalu klik "Unduh".',
    step3Title: '3. Simpan ke Perangkat',
    step3Desc: 'Pilih resolusi yang diinginkan dan file langsung tersimpan ke galeri Anda.',
    faqs: [
      {
        q: 'Apakah insta1000gram gratis?',
        a: 'Ya, 100% gratis tanpa batasan unduhan dan tanpa perlu mendaftar akun.',
      },
      {
        q: 'Apakah video Reels diunduh dengan kualitas HD?',
        a: 'Ya, kami mengambil file MP4 kualitas tertinggi 1080p 60fps dengan suara jernih.',
      },
      {
        q: 'Bisakah saya mengunduh Story secara anonim?',
        a: 'Bisa, nama akun Anda tidak akan pernah muncul di daftar penonton Story.',
      },
      {
        q: 'Bagaimana cara menggunakan trik 1000?',
        a: 'Cukup tambahkan 1000 pada alamat link menjadi insta1000gram.com untuk mengunduh langsung.',
      },
    ],
    secretShortcutSub: 'Cara tercepat mengunduh langsung dari bilah alamat browser',
    secretShortcutOriginal: 'Tautan asli:',
    secretShortcutModified: 'Tambahkan "1000" lalu tekan Enter:',
    mobileOptimizedTitle: 'Optimal untuk Ponsel Pintar',
    mobileOptimizedDesc: 'Simpan langsung ke galeri di Safari atau Chrome tanpa aplikasi tambahan.',
    desktopOptimizedTitle: 'Unduhan Cepat di Komputer',
    desktopOptimizedDesc: 'Koneksi paralel berkecepatan tinggi untuk pengguna Windows dan Mac.',
    pseoSectionTitle: 'Daftar Alat Pengunduh',
    pseoSectionSubtitle: 'Jelajahi pengunduh khusus untuk Reels, Story, Foto, Video, dan Sorotan.',
    viewAllSitemaps: 'Lihat daftar',
    carouselSlides: 'Slide album karosel',
    storiesList: 'Daftar story',
    highlightItems: 'Item sorotan',
    downloadSlide: 'Unduh Slide',
    downloadStory: 'Unduh Story',
    downloadHighlight: 'Unduh Sorotan',
    downloadVideo: 'Unduh Video (MP4)',
    downloadPhoto: 'Unduh Foto (JPG)',
    downloadZip: 'Unduh Semua (.ZIP)',
    downloadAudio: 'Hanya Audio (MP3)',
    downloading: 'Sedang mengunduh...',
    downloadComplete: 'Unduhan selesai!',
    savingToDevice: 'Menyimpan ke perangkat Anda...',
    scanQrCode: 'Pindai kode QR untuk mengunduh di HP',
    directLink: 'Tautan cermin langsung',
    downloadProgressLabel: 'Progres Pengunduhan',
    anonymousBadge: 'Mode Anonim Aktif',
    browserDownloadFallback: 'Atau klik di sini untuk mengunduh langsung di browser',
  },
};

// Generic English base extended content
const EN_EXTENDED: ExtendedLanguageContent = {
  feature1Title: 'Zero Quality Loss (1080p HD)',
  feature1Desc: 'Direct CDN stream extraction maintains original high-bitrate video, 60fps frame rate, and full pixel dimensions.',
  feature2Title: '100% Anonymous & Private',
  feature2Desc: 'View and save stories, reels, and profile highlights discreetly without sending tracking tokens or logging in.',
  feature3Title: 'Adaptive High-Speed Edge Network',
  feature3Desc: 'Multi-datacenter relay automatically handles and resumes downloads seamlessly on mobile and desktop.',
  feature4Title: 'Clean & Watermark Free',
  feature4Desc: 'Pure MP4 and JPG output with zero appended branding, stamps, logos, or compression artifacts.',
  step1Title: '1. Copy Instagram Link',
  step1Desc: 'Open Instagram in the app or browser, tap Share or the three dots, and choose "Copy Link".',
  step2Title: '2. Paste into Downloader',
  step2Desc: 'Paste the copied URL into the input field above and click "Fetch & Download".',
  step3Title: '3. Save 1080p Media',
  step3Desc: 'Select your preferred resolution or audio format and save directly to your camera roll or downloads folder.',
  faqs: [
    {
      q: 'Is insta1000gram completely free to use?',
      a: 'Yes, insta1000gram is 100% free with unlimited downloads and no account required.',
    },
    {
      q: 'Does downloading Instagram Reels reduce video quality?',
      a: 'No. We extract the original 1080p 60fps MP4 stream directly from Instagram media servers.',
    },
    {
      q: 'Can I download Instagram Stories and Highlights anonymously?',
      a: 'Yes. Our proxy servers fetch the media without sending any user identifier, so your profile never appears in the viewer list.',
    },
    {
      q: 'How does the 1000 URL shortcut work?',
      a: 'Whenever you have an Instagram link, simply change instagram.com to insta1000gram.com in your browser address bar to download instantly!',
    },
  ],
  secretShortcutSub: 'The fastest way to download directly from your browser address bar',
  secretShortcutOriginal: 'Original link:',
  secretShortcutModified: 'Add "1000" and press Enter:',
  mobileOptimizedTitle: 'Mobile Optimized for iOS & Android',
  mobileOptimizedDesc: 'Save directly to your camera roll in Safari on iPhone or Google Chrome on Android with zero apps.',
  desktopOptimizedTitle: 'Ultra-Fast Desktop Downloads',
  desktopOptimizedDesc: 'High-throughput parallel streams for lightning-fast downloads on Windows, Mac, and Linux.',
  pseoSectionTitle: 'Directory of Instagram Downloaders',
  pseoSectionSubtitle: 'Explore specialized high-speed downloaders for Reels, Videos, Stories, Photos, and Highlights.',
  viewAllSitemaps: 'View Directory',
  carouselSlides: 'Carousel Slides',
  storiesList: 'Stories List',
  highlightItems: 'Highlight Items',
  downloadSlide: 'Download Slide',
  downloadStory: 'Download Story',
  downloadHighlight: 'Download Highlight Item',
  downloadVideo: 'Download Video (MP4)',
  downloadPhoto: 'Download Image (JPG)',
  downloadZip: 'Download All Items (.ZIP Archive)',
  downloadAudio: 'Audio Only (MP3)',
  downloading: 'Downloading...',
  downloadComplete: 'Download Complete!',
  savingToDevice: 'Saving to your device...',
  scanQrCode: 'Scan QR Code to Download on Mobile Phone',
  directLink: 'Direct Mirror Link',
  downloadProgressLabel: 'Download Progress',
  anonymousBadge: 'Anonymous Mode Active',
  browserDownloadFallback: 'Or click here to download directly in browser',
};

// Generate base dictionary for any supported language using COMMON_TRANSLATIONS and rich extensions
function buildDictionaryForLanguage(lang: SupportedLanguage): TranslationDictionary {
  const common = COMMON_TRANSLATIONS[lang] || COMMON_TRANSLATIONS.en;
  const enCommon = COMMON_TRANSLATIONS.en;
  const ext = EXTENDED_TRANSLATIONS[lang] || EN_EXTENDED;

  return {
    brandName: common.brandName || enCommon.brandName,
    brandTagline: common.brandTagline || enCommon.brandTagline,
    navReels: common.navReels || enCommon.navReels,
    navVideo: common.navVideo || enCommon.navVideo,
    navPhoto: common.navPhoto || enCommon.navPhoto,
    navStories: common.navStories || enCommon.navStories,
    navHighlights: common.navHighlights || enCommon.navHighlights,
    navIgtv: common.navIgtv || enCommon.navIgtv,
    navAdmin: common.navAdmin || enCommon.navAdmin,
    heroTitle: common.heroTitle || enCommon.heroTitle,
    heroHighlight: common.heroHighlight || enCommon.heroHighlight,
    heroSubtitle: common.heroSubtitle || enCommon.heroSubtitle,
    inputPlaceholder: common.inputPlaceholder || enCommon.inputPlaceholder,
    pasteBtn: common.pasteBtn || enCommon.pasteBtn,
    downloadBtn: common.downloadBtn || enCommon.downloadBtn,
    resolvingText: common.resolvingText || enCommon.resolvingText,
    processingStream: common.processingStream || enCommon.processingStream,
    reliableNetworkBadge: common.reliableNetworkBadge || enCommon.reliableNetworkBadge,
    retryAttempt: common.retryAttempt || enCommon.retryAttempt,
    downloadSuccess: common.downloadSuccess || enCommon.downloadSuccess,
    readyInHD: common.readyInHD || enCommon.readyInHD,
    downloadFileBtn: common.downloadFileBtn || enCommon.downloadFileBtn,
    downloadAllBtn: common.downloadAllBtn || enCommon.downloadAllBtn,
    audioOnlyBtn: common.audioOnlyBtn || enCommon.audioOnlyBtn,
    featuresTitle: common.featuresTitle || enCommon.featuresTitle,
    featuresSubtitle: common.featuresSubtitle || enCommon.featuresSubtitle,
    feature1Title: ext.feature1Title,
    feature1Desc: ext.feature1Desc,
    feature2Title: ext.feature2Title,
    feature2Desc: ext.feature2Desc,
    feature3Title: ext.feature3Title,
    feature3Desc: ext.feature3Desc,
    feature4Title: ext.feature4Title,
    feature4Desc: ext.feature4Desc,
    howToTitle: common.howToTitle || enCommon.howToTitle,
    howToSubtitle: common.howToSubtitle || enCommon.howToSubtitle,
    step1Title: ext.step1Title,
    step1Desc: ext.step1Desc,
    step2Title: ext.step2Title,
    step2Desc: ext.step2Desc,
    step3Title: ext.step3Title,
    step3Desc: ext.step3Desc,
    faqTitle: common.faqTitle || enCommon.faqTitle,
    faqSubtitle: common.faqSubtitle || enCommon.faqSubtitle,
    faqs: ext.faqs,
    pseoSectionTitle: ext.pseoSectionTitle,
    pseoSectionSubtitle: ext.pseoSectionSubtitle,
    viewAllSitemaps: ext.viewAllSitemaps,
    footerRights: common.footerRights || enCommon.footerRights,
    footerDisclaimer: common.footerDisclaimer || enCommon.footerDisclaimer,
    fastSpeedNotice: common.fastSpeedNotice || enCommon.fastSpeedNotice,
    sslSecureNotice: common.sslSecureNotice || enCommon.sslSecureNotice,
    quickTestLabel: common.quickTestLabel || enCommon.quickTestLabel,
    secretShortcutBadge: common.secretShortcutBadge || enCommon.secretShortcutBadge,
    secretShortcutSub: ext.secretShortcutSub,
    secretShortcutTitle: common.secretShortcutTitle || enCommon.secretShortcutTitle,
    secretShortcutDesc: common.secretShortcutDesc || enCommon.secretShortcutDesc,
    secretShortcutOriginal: ext.secretShortcutOriginal,
    secretShortcutModified: ext.secretShortcutModified,
    mobileOptimizedTitle: ext.mobileOptimizedTitle,
    mobileOptimizedDesc: ext.mobileOptimizedDesc,
    desktopOptimizedTitle: ext.desktopOptimizedTitle,
    desktopOptimizedDesc: ext.desktopOptimizedDesc,
    allToolsTitle: common.allToolsTitle || enCommon.allToolsTitle,
    allToolsDesc: common.allToolsDesc || enCommon.allToolsDesc,
    carouselSlides: ext.carouselSlides,
    storiesList: ext.storiesList,
    highlightItems: ext.highlightItems,
    downloadSlide: ext.downloadSlide,
    downloadStory: ext.downloadStory,
    downloadHighlight: ext.downloadHighlight,
    downloadVideo: ext.downloadVideo,
    downloadPhoto: ext.downloadPhoto,
    downloadZip: ext.downloadZip,
    downloadAudio: ext.downloadAudio,
    downloading: ext.downloading,
    downloadComplete: ext.downloadComplete,
    savingToDevice: ext.savingToDevice,
    scanQrCode: ext.scanQrCode,
    directLink: ext.directLink,
    downloadProgressLabel: ext.downloadProgressLabel,
    anonymousBadge: ext.anonymousBadge,
    browserDownloadFallback: ext.browserDownloadFallback,
  };
}

export const DEFAULT_TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = ALL_SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang] = buildDictionaryForLanguage(lang);
    return acc;
  },
  {} as Record<SupportedLanguage, TranslationDictionary>
);

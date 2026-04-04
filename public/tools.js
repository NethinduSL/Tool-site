/**
 * tools.js — Central tool registry for Bit X Tools
 *
 * HOW TO ADD A NEW TOOL:
 * 1. Create the HTML file in the correct subfolder:
 *    AI tools    → /public/AI/
 *    Downloaders → /public/DOWNLOAD/
 *    Utilities   → /public/TOOL/
 * 2. Add an entry below with the correct folder prefix in `link`
 * 3. Done — it appears on the homepage automatically.
 *
 * FIELDS:
 *   id      {string}  Unique identifier (used for admin enable/disable)
 *   name    {string}  Display name
 *   cat     {string}  Category key
 *   icon    {string}  Font Awesome icon name (without 'fa-')
 *   fab     {boolean} true = fa-brands, false = fa-solid
 *   color   {string}  Hex icon colour
 *   desc    {string}  Short card description
 *   link    {string}  URL path (folder-prefixed) or full external URL
 *   badge   {string}  Optional: 'hot' | 'new' | 'ai'
 *   section {string}  Optional: sub-section label on the card
 *   usage   {string}  Optional: short usage hint pill
 */

const TOOLS = [

  // ── AI — CHAT ──────────────────────────────────────────────────────────────
  {
    id: 'ai-chat-askai',
    name: 'AskAI (ChatGPT 4o)',
    cat: 'AI',
    icon: 'robot',
    fab: false,
    color: '#4f8ef7',
    desc: 'Chat with GPT-4o powered AskAI. Ask anything and get instant smart answers.',
    link: 'AI/ai-chat.html',
    badge: 'hot',
    section: 'Chat',
    usage: 'Type a message → Get AI answer'
  },
  {
    id: 'ai-chat-talkai',
    name: 'TalkAI (GPT-4.1-Nano)',
    cat: 'AI',
    icon: 'comments',
    fab: false,
    color: '#7c5cfc',
    desc: 'GPT-4.1-Nano conversational AI for in-depth questions and responses.',
    link: 'AI/ai-chat.html?model=talkai',
    badge: 'ai',
    section: 'Chat',
    usage: 'Ask anything → Deep response'
  },
  {
    id: 'ai-chat-dolphin',
    name: 'Dolphin AI (24B)',
    cat: 'AI',
    icon: 'water',
    fab: false,
    color: '#06b6d4',
    desc: 'Dolphin 24B logical AI — fast, uncensored, and helpful.',
    link: 'AI/ai-chat.html?model=dolphin',
    badge: 'ai',
    section: 'Chat',
    usage: 'Chat freely → Instant reply'
  },
  {
    id: 'ai-chat-claude',
    name: 'Claude 3.5 Sonnet',
    cat: 'AI',
    icon: 'brain',
    fab: false,
    color: '#a855f7',
    desc: 'Claude 3.5 Sonnet by Anthropic — thoughtful, nuanced, and accurate.',
    link: 'AI/ai-chat.html?model=claude',
    badge: 'ai',
    section: 'Chat',
    usage: 'Ask → Nuanced answer'
  },
  {
    id: 'ai-chat-venice',
    name: 'Venice AI (GLM-4.6)',
    cat: 'AI',
    icon: 'landmark',
    fab: false,
    color: '#fb923c',
    desc: 'Venice AI — privacy-first chat powered by GLM-4.6 open model.',
    link: 'AI/ai-chat.html?model=venice',
    section: 'Chat',
    usage: 'Private chat → Open model'
  },
  {
    id: 'ai-chat-overchat',
    name: 'Overchat (GPT-5.2-Nano)',
    cat: 'AI',
    icon: 'bolt',
    fab: false,
    color: '#f472b6',
    desc: 'Overchat powered by GPT-5.2-Nano — fast and efficient AI replies.',
    link: 'AI/ai-chat.html?model=overchat',
    section: 'Chat',
    usage: 'Chat → Fast reply'
  },
  {
    id: 'ai-chat-aifree',
    name: 'AI Free (GPT-5.2-Nano)',
    cat: 'AI',
    icon: 'circle-dot',
    fab: false,
    color: '#34d399',
    desc: 'Free AI chat powered by GPT-5.2-Nano with no login required.',
    link: 'AI/ai-chat.html?model=aifree',
    section: 'Chat',
    usage: 'No login → Free chat'
  },
  {
    id: 'ai-chat-notegpt',
    name: 'NoteGPT (GPT-4.1-Mini)',
    cat: 'AI',
    icon: 'note-sticky',
    fab: false,
    color: '#fbbf24',
    desc: 'NoteGPT powered by GPT-4.1-Mini — great for notes and summaries.',
    link: 'AI/ai-chat.html?model=notegpt',
    section: 'Chat',
    usage: 'Ask → Summary & notes'
  },
  {
    id: 'ai-chat-writecream',
    name: 'WriteCream (GPT-4o)',
    cat: 'AI',
    icon: 'pen-nib',
    fab: false,
    color: '#818cf8',
    desc: 'WriteCream AI powered by GPT-4o — ideal for writing and content creation.',
    link: 'AI/ai-chat.html?model=writecream',
    section: 'Write',
    usage: 'Prompt → AI written content'
  },
  {
    id: 'ai-chat-writify',
    name: 'Writify (GPT-4o-Turbo)',
    cat: 'AI',
    icon: 'feather',
    fab: false,
    color: '#2dd4bf',
    desc: 'Writify powered by GPT-4o-Turbo — high quality creative writing AI.',
    link: 'AI/ai-chat.html?model=writify',
    section: 'Write',
    usage: 'Topic → Creative content'
  },
  {
    id: 'ai-chat-on4t',
    name: 'On4T (GPT-5.2-Standard)',
    cat: 'AI',
    icon: 'microchip',
    fab: false,
    color: '#e879f9',
    desc: 'On4T AI powered by GPT-5.2-Standard — balanced and reliable responses.',
    link: 'AI/ai-chat.html?model=on4t',
    section: 'Chat',
    usage: 'Ask → Reliable answer'
  },
  {
    id: 'ai-chat-openaiid',
    name: 'ChatOpenAI (GPT-4o)',
    cat: 'AI',
    icon: 'comment-dots',
    fab: false,
    color: '#4ade80',
    desc: 'ChatOpenAI interface powered by GPT-4o for versatile AI conversations.',
    link: 'AI/ai-chat.html?model=openaiid',
    section: 'Chat',
    usage: 'Chat → GPT-4o power'
  },
  {
    id: 'ai-chat-softorbits',
    name: 'SoftOrbits (Gemini 1.5 Pro)',
    cat: 'AI',
    icon: 'satellite',
    fab: false,
    color: '#f59e0b',
    desc: 'SoftOrbits AI powered by Gemini 1.5 Pro — Google\'s advanced model.',
    link: 'AI/ai-chat.html?model=softorbits',
    section: 'Chat',
    usage: 'Ask → Gemini response'
  },

  // ── AI — IMAGE & DETECT ────────────────────────────────────────────────────
  {
    id: 'ai-image-gen',
    name: 'AI Image Generator',
    cat: 'AI',
    icon: 'image',
    fab: false,
    color: '#f472b6',
    desc: 'Generate stunning AI images from text prompts using Zonerai AI — free, instant.',
    link: 'AI/ai-image.html',
    badge: 'new',
    section: 'Image',
    usage: 'Type prompt → Generate image'
  },
  {
    id: 'ai-detector',
    name: 'AI Text Detector',
    cat: 'AI',
    icon: 'magnifying-glass',
    fab: false,
    color: '#34d399',
    desc: 'Detect whether a piece of text was written by AI or a human.',
    link: 'AI/ai-detector.html',
    section: 'Detect',
    usage: 'Paste text → AI or Human?'
  },

  // ── DOWNLOAD ───────────────────────────────────────────────────────────────
  {
    id: 'dl-ytmp3',
    name: 'YouTube MP3',
    cat: 'Download',
    icon: 'youtube',
    fab: true,
    color: '#ef4444',
    desc: 'Download YouTube videos as MP3 audio. Just paste the URL.',
    link: 'DOWNLOAD/downloader.html?type=ytmp3',
    badge: 'hot',
    section: 'Video',
    usage: 'Paste URL → Download MP3'
  },
  {
    id: 'dl-tiktok',
    name: 'TikTok Downloader',
    cat: 'Download',
    icon: 'tiktok',
    fab: true,
    color: '#e879f9',
    desc: 'Download TikTok videos without watermark instantly.',
    link: 'DOWNLOAD/downloader.html?type=tiktok',
    badge: 'hot',
    section: 'Video',
    usage: 'Paste link → No watermark'
  },
  {
    id: 'dl-instagram',
    name: 'Instagram DL',
    cat: 'Download',
    icon: 'instagram',
    fab: true,
    color: '#f472b6',
    desc: 'Download Instagram photos, videos and reels easily.',
    link: 'DOWNLOAD/downloader.html?type=instagram',
    section: 'Social',
    usage: 'Paste post URL → Download'
  },
  {
    id: 'dl-facebook',
    name: 'Facebook DL',
    cat: 'Download',
    icon: 'facebook',
    fab: true,
    color: '#4f8ef7',
    desc: 'Download Facebook videos in HD or SD quality.',
    link: 'DOWNLOAD/downloader.html?type=facebook',
    section: 'Social',
    usage: 'Paste video URL → HD/SD'
  },
  {
    id: 'dl-spotify',
    name: 'Spotify DL',
    cat: 'Download',
    icon: 'spotify',
    fab: true,
    color: '#4ade80',
    desc: 'Download Spotify tracks as MP3 audio files.',
    link: 'DOWNLOAD/downloader.html?type=spotify',
    section: 'Music',
    usage: 'Paste Spotify link → MP3'
  },
  {
    id: 'dl-soundcloud',
    name: 'SoundCloud DL',
    cat: 'Download',
    icon: 'soundcloud',
    fab: true,
    color: '#fb923c',
    desc: 'Download SoundCloud tracks and audio files.',
    link: 'DOWNLOAD/downloader.html?type=soundcloud',
    section: 'Music',
    usage: 'Paste track URL → Audio'
  },
  {
    id: 'dl-mediafire',
    name: 'Mediafire DL',
    cat: 'Download',
    icon: 'cloud-arrow-down',
    fab: false,
    color: '#fbbf24',
    desc: 'Direct download from Mediafire links with one click.',
    link: 'DOWNLOAD/downloader.html?type=mediafire',
    section: 'Files',
    usage: 'Paste Mediafire link → Download'
  },
  {
    id: 'dl-mega',
    name: 'Mega.nz DL',
    cat: 'Download',
    icon: 'database',
    fab: false,
    color: '#e11d48',
    desc: 'Download files from Mega.nz links directly.',
    link: 'DOWNLOAD/downloader.html?type=mega',
    section: 'Files',
    usage: 'Paste Mega link → Download'
  },
  {
    id: 'dl-terabox',
    name: 'Terabox DL',
    cat: 'Download',
    icon: 'box-archive',
    fab: false,
    color: '#06b6d4',
    desc: 'Download files from Terabox links easily.',
    link: 'DOWNLOAD/downloader.html?type=terabox',
    section: 'Files',
    usage: 'Paste Terabox link → Download'
  },
  {
    id: 'dl-wallpaper',
    name: 'Wallpaper Download',
    cat: 'Download',
    icon: 'panorama',
    fab: false,
    color: '#818cf8',
    desc: 'Search and download beautiful HD wallpapers instantly.',
    link: 'DOWNLOAD/wallpaper.html',
    section: 'Images',
    usage: 'Search → Download HD wallpaper'
  },
  {
    id: 'dl-movies',
    name: 'Movies & Anime',
    cat: 'Download',
    icon: 'film',
    fab: false,
    color: '#a855f7',
    desc: 'Search Sinhala-dubbed movies and Chinese Anime. Get direct download links.',
    link: 'DOWNLOAD/movies.html',
    section: 'Movies',
    usage: 'Search title → Download'
  },
  {
    id: 'dl-anime',
    name: 'Anime Search',
    cat: 'Download',
    icon: 'tv',
    fab: false,
    color: '#f472b6',
    desc: 'Search and discover Chinese Anime / Donghua with episode lists.',
    link: 'DOWNLOAD/movies.html?tab=anime',
    section: 'Anime',
    usage: 'Search title → Episodes'
  },

  // ── TEXT ───────────────────────────────────────────────────────────────────
  {
    id: 'text-converter',
    name: 'Text Converter',
    cat: 'Text',
    icon: 'font',
    fab: false,
    color: '#2dd4bf',
    desc: 'Convert text to stylish Unicode fonts — bold, italic, cursive and more.',
    link: 'https://sinfig.vercel.app/',
    badge: 'new',
    section: 'Fonts',
    usage: 'Type text → Pick style'
  },
  {
    id: 'text-to-image',
    name: 'Text to Image',
    cat: 'Text',
    icon: 'image',
    fab: false,
    color: '#a78bfa',
    desc: 'Render text as an image using custom Sinhala and Unicode fonts.',
    link: 'https://sinfig.vercel.app/?tab=textimg',
    section: 'Render',
    usage: 'Enter text → PNG image'
  },
  {
    id: 'font-viewer',
    name: 'Font Viewer',
    cat: 'Text',
    icon: 'text-height',
    fab: false,
    color: '#34d399',
    desc: 'Browse all available fonts with live preview.',
    link: 'https://sinfig.vercel.app/?tab=fonts',
    section: 'Fonts',
    usage: 'Browse → Preview fonts'
  },

  // ── TOOLS ──────────────────────────────────────────────────────────────────
  {
    id: 'tool-weather',
    name: 'Weather',
    cat: 'Tools',
    icon: 'cloud-sun',
    fab: false,
    color: '#fbbf24',
    desc: 'Get real-time weather data for any city worldwide.',
    link: 'TOOL/tools.html?type=weather',
    badge: 'new',
    section: 'Info',
    usage: 'Enter city → Live weather'
  },
  {
    id: 'tool-url-shortener',
    name: 'URL Shortener',
    cat: 'Tools',
    icon: 'link',
    fab: false,
    color: '#4f8ef7',
    desc: 'Shorten long URLs instantly using l8.lk.',
    link: 'TOOL/tools.html?type=shorten',
    section: 'Utility',
    usage: 'Paste URL → Short link'
  },
  {
    id: 'tool-news',
    name: 'Sri Lanka News',
    cat: 'Tools',
    icon: 'newspaper',
    fab: false,
    color: '#fb923c',
    desc: 'Latest news from Daily Mirror and Hiru News Sri Lanka.',
    link: 'TOOL/tools.html?type=news',
    section: 'News',
    usage: 'Open → Latest Sri Lanka news'
  },
  {
    id: 'tool-telegram-stickers',
    name: 'Telegram Stickers',
    cat: 'Tools',
    icon: 'face-smile',
    fab: false,
    color: '#34d399',
    desc: 'Download Telegram sticker packs by entering the pack name.',
    link: 'TOOL/tools.html?type=stickers',
    section: 'Social',
    usage: 'Pack name → Download all'
  },
  {
    id: 'tool-sinhala-song',
    name: 'Sinhala Songs',
    cat: 'Tools',
    icon: 'music',
    fab: false,
    color: '#f472b6',
    desc: 'Search and download Sinhala songs by name or artist.',
    link: 'TOOL/tools.html?type=sinsong',
    section: 'Music',
    usage: 'Search song → Download'
  },
  {
    id: 'translator',
    name: 'Language Translator',
    cat: 'Tools',
    icon: 'language',
    fab: false,
    color: '#818cf8',
    desc: 'Translate text instantly between multiple languages including Sinhala.',
    link: 'TOOL/translator.html',
    badge: 'new',
    section: 'Utility',
    usage: 'Enter text → Choose language → Translate'
  },
  {
    id: 'tool-exchange-rate',
    name: 'Currency Converter',
    cat: 'Tools',
    icon: 'coins',
    fab: false,
    color: '#fbbf24',
    desc: 'Convert currencies with live exchange rates from around the world.',
    link: 'TOOL/exchangerate.html',
    section: 'Finance',
    usage: 'Enter amount → Convert currency'
  }

];

// Export for Node.js require() — must be unconditional
module.exports = { TOOLS };

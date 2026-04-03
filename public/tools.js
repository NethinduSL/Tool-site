/**
 * tools.js — Central tool registry for Bit X Tools
 * 
 * HOW TO ADD A NEW TOOL:
 * 1. Create the tool's HTML file in /public/ (e.g., my-tool.html)
 * 2. Add a new entry to the TOOLS array below
 * 3. That's it! It will automatically appear on the homepage.
 *
 * TOOL OBJECT FIELDS:
 *   id       {string}  Unique identifier (used for disable/enable in admin)
 *   name     {string}  Display name
 *   cat      {string}  Category — must match one of the CATEGORIES list
 *   icon     {string}  Font Awesome icon name (without 'fa-')
 *   fab      {boolean} true = Font Awesome Brands class, false = Solid
 *   color    {string}  Hex color for the icon
 *   desc     {string}  Short description shown on the card
 *   link     {string}  URL path or external link
 *   badge    {string}  Optional: 'hot' | 'new' | 'ai'
 *   section  {string}  Optional: sub-section label shown inside card
 *   usage    {string}  Optional: short usage pill text (e.g. "Paste URL → Download")
 */

const TOOLS = [
  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    id: 'ai-chat-gpt4o',
    name: 'AI Chat (AskAI)',
    cat: 'AI',
    icon: 'robot',
    fab: false,
    color: '#4f8ef7',
    desc: 'Chat with GPT-4o powered AI. Ask anything and get instant smart answers.',
    link: 'ai-chat.html',
    badge: 'hot',
    section: 'Chat',
    usage: 'Type a message → Get AI answer'
  },
  {
    id: 'ai-chat-talkai',
    name: 'TalkAI (GPT-4)',
    cat: 'AI',
    icon: 'comments',
    fab: false,
    color: '#7c5cfc',
    desc: 'Powerful GPT-4 conversational AI for in-depth questions and responses.',
    link: 'ai-chat.html?model=talkai',
    badge: 'ai',
    section: 'Chat',
    usage: 'Ask anything → Deep response'
  },
  {
    id: 'ai-chat-dolphin',
    name: 'Dolphin AI',
    cat: 'AI',
    icon: 'water',
    fab: false,
    color: '#06b6d4',
    desc: 'Dolphin AI chat model — fast, uncensored, and helpful.',
    link: 'ai-chat.html?model=dolphin',
    badge: 'ai',
    section: 'Chat',
    usage: 'Chat freely → Instant reply'
  },
  {
    id: 'ai-chat-claude',
    name: 'Claude AI',
    cat: 'AI',
    icon: 'brain',
    fab: false,
    color: '#a855f7',
    desc: 'Claude AI by Anthropic — thoughtful, nuanced, and accurate.',
    link: 'ai-chat.html?model=claude',
    badge: 'ai',
    section: 'Chat',
    usage: 'Ask → Nuanced answer'
  },
  {
    id: 'ai-chat-venice',
    name: 'Venice AI',
    cat: 'AI',
    icon: 'landmark',
    fab: false,
    color: '#fb923c',
    desc: 'Venice AI — privacy-first AI chat powered by open models.',
    link: 'ai-chat.html?model=venice',
    section: 'Chat',
    usage: 'Private chat → Open models'
  },
  {
    id: 'ai-image-gen',
    name: 'AI Image Generator',
    cat: 'AI',
    icon: 'image',
    fab: false,
    color: '#f472b6',
    desc: 'Generate stunning images from text prompts using AI image models.',
    link: 'ai-image.html',
    badge: 'new',
    section: 'Image',
    usage: 'Type prompt → Generate image'
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
    link: 'downloader.html?type=ytmp3',
    badge: 'hot',
    section: 'Video',
    usage: 'Paste URL → Download MP3'
  },
  {
    id: 'dl-ytmp4',
    name: 'YouTube MP4',
    cat: 'Download',
    icon: 'youtube',
    fab: true,
    color: '#ef4444',
    desc: 'Download YouTube videos in MP4 video format.',
    link: 'downloader.html?type=ytmp4',
    section: 'Video',
    usage: 'Paste URL → Download MP4'
  },
  {
    id: 'dl-tiktok',
    name: 'TikTok Downloader',
    cat: 'Download',
    icon: 'tiktok',
    fab: true,
    color: '#e879f9',
    desc: 'Download TikTok videos without watermark instantly.',
    link: 'downloader.html?type=tiktok',
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
    link: 'downloader.html?type=instagram',
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
    link: 'downloader.html?type=facebook',
    section: 'Social',
    usage: 'Paste video URL → HD/SD'
  },
  {
    id: 'dl-twitter',
    name: 'Twitter/X DL',
    cat: 'Download',
    icon: 'x-twitter',
    fab: true,
    color: '#b0b8e0',
    desc: 'Download videos and GIFs from Twitter / X posts.',
    link: 'downloader.html?type=twitter',
    section: 'Social',
    usage: 'Paste tweet URL → Download'
  },
  {
    id: 'dl-spotify',
    name: 'Spotify DL',
    cat: 'Download',
    icon: 'spotify',
    fab: true,
    color: '#4ade80',
    desc: 'Download Spotify tracks as MP3 audio files.',
    link: 'downloader.html?type=spotify',
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
    link: 'downloader.html?type=soundcloud',
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
    link: 'downloader.html?type=mediafire',
    section: 'Files',
    usage: 'Paste Mediafire link → Download'
  },
  {
    id: 'dl-pinterest',
    name: 'Pinterest DL',
    cat: 'Download',
    icon: 'pinterest',
    fab: true,
    color: '#ef4444',
    desc: 'Download Pinterest images and videos easily.',
    link: 'downloader.html?type=pinterest',
    badge: 'new',
    section: 'Images',
    usage: 'Paste pin URL → Download'
  },
  {
    id: 'dl-threads',
    name: 'Threads DL',
    cat: 'Download',
    icon: 'at',
    fab: false,
    color: '#e879f9',
    desc: 'Download videos and images from Threads posts.',
    link: 'downloader.html?type=threads',
    badge: 'new',
    section: 'Social',
    usage: 'Paste Threads link → Save'
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
  {
    id: 'word-counter',
    name: 'Word Counter',
    cat: 'Text',
    icon: 'calculator',
    fab: false,
    color: '#38bdf8',
    desc: 'Count words, characters, sentences and reading time.',
    link: 'tools.html?type=wordcount',
    badge: 'new',
    section: 'Analysis',
    usage: 'Paste text → Word stats'
  },
  {
    id: 'base64',
    name: 'Base64 Encoder',
    cat: 'Text',
    icon: 'code',
    fab: false,
    color: '#fbbf24',
    desc: 'Encode and decode Base64 strings instantly.',
    link: 'tools.html?type=base64',
    badge: 'new',
    section: 'Encode',
    usage: 'Text → Base64 or reverse'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    cat: 'Text',
    icon: 'brackets-curly',
    fab: false,
    color: '#a855f7',
    desc: 'Format, validate and beautify JSON data online.',
    link: 'tools.html?type=json',
    badge: 'new',
    section: 'Dev',
    usage: 'Paste JSON → Beautify'
  },

  // ── SEARCH ─────────────────────────────────────────────────────────────────
  {
    id: 'search-youtube',
    name: 'YouTube Search',
    cat: 'Search',
    icon: 'magnifying-glass',
    fab: false,
    color: '#ef4444',
    desc: 'Search YouTube videos and get results with thumbnails and links.',
    link: 'search.html?type=youtube',
    section: 'Video',
    usage: 'Enter keyword → Video results'
  },
  {
    id: 'search-wallpaper',
    name: 'Wallpaper Search',
    cat: 'Search',
    icon: 'panorama',
    fab: false,
    color: '#818cf8',
    desc: 'Find beautiful HD wallpapers by keyword from multiple sources.',
    link: 'search.html?type=wallpaper',
    section: 'Images',
    usage: 'Search → HD wallpapers'
  },
  {
    id: 'search-anime',
    name: 'Anime Search',
    cat: 'Search',
    icon: 'tv',
    fab: false,
    color: '#f472b6',
    desc: 'Search and discover anime series with episode info and links.',
    link: 'search.html?type=anime',
    section: 'Anime',
    usage: 'Search title → Episodes'
  },
  {
    id: 'search-gif',
    name: 'GIF Search',
    cat: 'Search',
    icon: 'gif',
    fab: false,
    color: '#fb923c',
    desc: 'Search and download GIFs from Giphy and Tenor.',
    link: 'search.html?type=gif',
    badge: 'new',
    section: 'Media',
    usage: 'Search term → GIF results'
  },

  // ── MOVIES ─────────────────────────────────────────────────────────────────
  {
    id: 'movies-search',
    name: 'Movie Search',
    cat: 'Movies',
    icon: 'film',
    fab: false,
    color: '#a855f7',
    desc: 'Search Sinhala-dubbed movies and find download links.',
    link: 'movies.html',
    section: 'Sinhala',
    usage: 'Search title → Download'
  },
  {
    id: 'movies-sinsub',
    name: 'Sinhalasub DL',
    cat: 'Movies',
    icon: 'subtitles',
    fab: false,
    color: '#7c5cfc',
    desc: 'Download movies from Sinhalasub.lk with all quality options.',
    link: 'movies.html?tab=sinsub',
    section: 'Sinhala',
    usage: 'Search → All quality options'
  },
  {
    id: 'movies-trailers',
    name: 'Trailer Search',
    cat: 'Movies',
    icon: 'clapperboard',
    fab: false,
    color: '#fb923c',
    desc: 'Search movie and TV trailers from YouTube.',
    link: 'movies.html?tab=trailers',
    badge: 'new',
    section: 'Trailers',
    usage: 'Movie name → Watch trailer'
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
    link: 'tools.html?type=weather',
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
    link: 'tools.html?type=shorten',
    section: 'Utility',
    usage: 'Paste URL → Short link'
  },
  {
    id: 'tool-qr',
    name: 'QR Generator',
    cat: 'Tools',
    icon: 'qrcode',
    fab: false,
    color: '#4ade80',
    desc: 'Generate QR codes from any text, URL or data instantly.',
    link: 'tools.html?type=qr',
    badge: 'new',
    section: 'Utility',
    usage: 'Enter data → QR code'
  },
  {
    id: 'tool-telegram-stickers',
    name: 'Telegram Stickers',
    cat: 'Tools',
    icon: 'face-smile',
    fab: false,
    color: '#34d399',
    desc: 'Download Telegram sticker packs by entering the pack name.',
    link: 'tools.html?type=stickers',
    section: 'Social',
    usage: 'Pack name → Download all'
  },
  {
    id: 'tool-sinhala-song',
    name: 'Sinhala Song',
    cat: 'Tools',
    icon: 'music',
    fab: false,
    color: '#f472b6',
    desc: 'Search and download Sinhala songs by name.',
    link: 'tools.html?type=sinsong',
    section: 'Music',
    usage: 'Search song → Download'
  },
  {
    id: 'tool-news',
    name: 'Daily Mirror News',
    cat: 'Tools',
    icon: 'newspaper',
    fab: false,
    color: '#fb923c',
    desc: 'Latest news from Daily Mirror Sri Lanka.',
    link: 'tools.html?type=news',
    section: 'News',
    usage: 'Open → Latest Sri Lanka news'
  },
  {
    id: 'tool-ip-lookup',
    name: 'IP Lookup',
    cat: 'Tools',
    icon: 'location-crosshairs',
    fab: false,
    color: '#38bdf8',
    desc: 'Find IP address info, location, ISP and more.',
    link: 'tools.html?type=ip',
    badge: 'new',
    section: 'Network',
    usage: 'Enter IP → Location & ISP'
  },
  {
    id: 'tool-color-picker',
    name: 'Color Picker',
    cat: 'Tools',
    icon: 'palette',
    fab: false,
    color: '#a78bfa',
    desc: 'Pick colors and get HEX, RGB, HSL codes instantly.',
    link: 'tools.html?type=color',
    badge: 'new',
    section: 'Design',
    usage: 'Pick color → HEX / RGB / HSL'
  }
];

// Export for Node.js require() — must be unconditional
module.exports = { TOOLS };

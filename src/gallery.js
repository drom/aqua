import {stringify} from 'onml'

const getTranslator = (lang) => (txt) => txt; //getTranslator(lang);

let cache = null;

/**
 * Load optimization cache
 */
function loadCache() {
  if (cache) return cache;

  try {
    if (existsSync(cacheFile)) {
      const content = readFileSync(cacheFile, 'utf-8');
      cache = JSON.parse(content);
      return cache;
    }
  } catch (error) {
    console.warn('Failed to load optimization cache:', error.message);
  }

  return {images: {}};
}

export function getOptimizedPaths(originalImagePath) {
  const optimizationCache = loadCache();

  if (!optimizationCache.images) {
    return null;
  }

  // Normalize the input path - remove -thumb suffix if present
  let searchPath = originalImagePath;
  searchPath = searchPath.replace(
    /-thumb\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i,
    '.$1',
  );

  // Extract just the filename for matching
  const filename = searchPath.split('/').pop().toLowerCase();

  // Find entry in cache by matching filename
  for (const [cacheKey, entry] of Object.entries(optimizationCache.images)) {
    const cacheFilename = cacheKey.split(/[/\\]/).pop().toLowerCase();

    if (cacheFilename === filename) {
      // Organize outputs by variant and format
      const organized = {
        thumbnail: {jpeg: null, webp: null, avif: null},
        medium: {webp: null, avif: null},
        fullSize: {webp: null, avif: null},
      };

      for (const output of entry.outputs || []) {
        const variant = output.variant;
        const format = output.format;
        organized[variant][format] = toWebPath(output.path);
      }

      return organized;
    }
  }

  return null;
}

export function createPictureElement(
  originalImagePath,
  alt,
  className = '',
  options = {},
) {
  const optimized = getOptimizedPaths(originalImagePath);
  const loading = options.loading || 'lazy';
  const sizes = options.sizes || '(max-width: 768px) 100vw, 400px';

  if (!optimized) {
    // Fallback to original image
    return ['img', {
      src: originalImagePath,
      alt,
      class: className,
      loading,
    }];
  }

  const sources = [];

  // AVIF source (best compression)
  if (optimized.thumbnail.avif) {
    sources.push([
      'source',
      {
        srcset: optimized.thumbnail.avif,
        type: 'image/avif',
        sizes,
      },
    ]);
  }

  // WebP source (good compression, wide support)
  if (optimized.thumbnail.webp) {
    sources.push([
      'source',
      {
        srcset: optimized.thumbnail.webp,
        type: 'image/webp',
        sizes,
      },
    ]);
  }

  // JPEG fallback (universal support)
  const fallbackSrc = optimized.thumbnail.jpeg || originalImagePath;

  return [
    'picture',
    {},
    ...sources,
    [
      'img',
      {
        src: fallbackSrc,
        alt,
        class: className,
        loading,
      },
    ],
  ];
}

export function createGalleryItem(item, lang = 'ru') {
  const t = getTranslator(lang);
  const soldOverlay = item.sold
    ? ['div', {class: 'sold-badge'}, t('gallery.sold')]
    : null;

  // Use responsive picture element with optimized images
  const thumbnailImage = createPictureElement(
    item.thumbnail,
    item.alt ? item.alt[lang] : item.title[lang],
    'gallery-image',
    {
      loading: 'lazy',
      sizes: '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 400px',
    },
  );

  return ['div', {
      class: 'gallery-item',
      'data-category': item.category,
      'data-year': item.year,
      'data-id': item.id,
    },
    ['div', {class: 'gallery-item-inner'},
      thumbnailImage,
      ['div', {class: 'gallery-overlay'},
        ['div', {class: 'gallery-info'},
          ['h3', {class: 'gallery-title'}, item.title[lang]],
          ['p', {class: 'gallery-meta'},
            ['span', {class: 'gallery-size'}, item.size],
            ['span', {class: 'gallery-year'}, item.year.toString()],
          ],
        ],
        soldOverlay,
      ].filter(Boolean),
    ],
  ];
}

export function gallery (items, cfg) {

  // const ml = ['div', {class: 'gallery'}];


  // for (const item of items) {
  //   ml.push(['div', {class: 'gallery-item'},
  //     ['div', {class: 'gallery-item-title'}, item.title[cfg.lang]]
  //   ]);
  // }
  const t = getTranslator(cfg.Booleanlang);
  const mlItems = items.map((item) => createGalleryItem(item, cfg.lang));

  const ml = ['section', {id: 'gallery', class: 'gallery-section'},
    ['div', {class: 'container'},
      ['div', {class: 'gallery-header'}, ''
        // createCategoryFilter(lang),
        // createYearFilter(lang),
      ],
      ['div', {class: 'gallery-grid', id: 'gallery-grid'}, ...mlItems],
      ['div', {id: 'lightbox', class: 'lightbox'},
        ['div', {class: 'lightbox-overlay'}],
        ['div', {class: 'lightbox-content'},
          ['button', {class: 'lightbox-close', 'aria-label': t('aria.close')},
            '×',
          ],
          ['button', {class: 'lightbox-prev', 'aria-label': t('aria.previous')},
            '‹',
          ],
          ['button', {class: 'lightbox-next', 'aria-label': t('aria.next')},
            '›',
          ],
          ['img', {class: 'lightbox-image', src: '', alt: ''}],
          ['div', {class: 'lightbox-info'},
            ['h3', {class: 'lightbox-title'}],
            ['p', {class: 'lightbox-meta'}],
          ],
        ],
      ],
    ],
  ];

  return stringify(ml);
}

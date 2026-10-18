import type { Page } from '@playwright/test';

/**
 * WCAG 2.1 contrast helpers shared by the UI regression specs.
 *
 * One module owns the maths so every spec reports the same ratio for the same
 * colours: the browser resolves computed styles (Tailwind v4 emits `oklch()`,
 * which no hand-rolled parser should try to read), this module computes the
 * SC 1.4.3 ratio from the resulting sRGB bytes.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0..1 */
  a: number;
}

/** WCAG 2.1 relative luminance (SC 1.4.3). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 contrast ratio between two colours (alpha ignored). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export function toHex(color: Rgb): string {
  return (
    '#' +
    [color.r, color.g, color.b]
      .map((value) => Math.round(value).toString(16).padStart(2, '0'))
      .join('')
  );
}

export interface TextSample {
  text: string;
  tag: string;
  className: string;
  fontSizePx: number;
  lineHeight: string;
  /** Text colour composited over its effective backdrop. */
  color: Rgb;
  /**
   * Effective backdrop: the fill the text actually sits on. Ancestor fills are
   * composited from the page background inward; a gradient ancestor is reduced
   * to the stop that is worst for the text (the one closest in luminance), so
   * the reported ratio is a lower bound for the whole gradient.
   */
  backdrop: Rgb;
  /** True when some ancestor paints a brand-600/800 fill (gradient or solid). */
  onBrandFill: boolean;
  /** True when the node's text is only pictographs (emoji), i.e. non-text content. */
  pictographOnly: boolean;
}

/** Theme tokens whose presence marks a fill as a dark brand surface. */
const BRAND_FILL_TOKENS = ['--color-brand-600', '--color-brand-800'];

/** WCAG AA floor for body text (SC 1.4.3). */
export const AA_TEXT_RATIO = 4.5;

/** WCAG floor for non-text content such as icons and pictographs (SC 1.4.11). */
export const NON_TEXT_RATIO = 3;

/**
 * Normalize CSS colour strings to sRGB bytes in the browser.
 *
 * Tailwind v4's palette is authored in `oklch()`, which no regex should try to
 * parse; the canvas resolves any notation the browser accepts.
 */
export async function resolveCssColors(page: Page, values: string[]): Promise<Rgb[]> {
  return page.evaluate((colors: string[]) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    return colors.map((value) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    });
  }, values);
}

/**
 * Resolve every rendered text node under `rootSelector` together with the
 * backdrop it sits on and its WCAG contrast ratio.
 *
 * Deterministic and mechanical: no screenshots, no source parsing. The browser
 * does the colour resolution (computed styles, canvas normalisation of
 * `oklch()`), Node does the ratio maths.
 */
export async function sampleTextContrast(
  page: Page,
  rootSelector = 'body',
): Promise<TextSample[]> {
  return page.evaluate((args: { brandTokens: string[]; rootSelector: string }) => {
    interface Rgb { r: number; g: number; b: number; a: number }

    // Canvas normalizes any CSS colour notation (oklch, color(srgb ...), rgb,
    // hex) to 8-bit sRGB, so Tailwind v4's oklch palette needs no parser here.
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const toRgba = (value: string): Rgb | null => {
      if (!value) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    };

    const compositeOver = (fg: Rgb, bg: Rgb): Rgb => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });

    const toHex = (color: Rgb) =>
      '#' + [color.r, color.g, color.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

    const { brandTokens, rootSelector } = args;
    const root = document.querySelector(rootSelector);
    if (!root) return [];
    const rootStyle = getComputedStyle(document.documentElement);
    const brandStops = brandTokens
      .map((token) => rootStyle.getPropertyValue(token).trim())
      .filter(Boolean);

    const gradientStops = (backgroundImage: string): Rgb[] => {
      if (!backgroundImage || !backgroundImage.includes('gradient')) return [];
      const stops: Rgb[] = [];
      const pattern = /(?:rgba?|oklch|oklab|hsla?|color)\([^)]*\)|#[0-9a-f]{3,8}/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(backgroundImage))) {
        const color = toRgba(match[0]);
        if (color) stops.push(color);
      }
      return stops;
    };

    const isBrandFill = (backgroundImage: string) => {
      const stops = gradientStops(backgroundImage);
      return stops.length > 0 && stops.some((stop) => brandStops.includes(toHex(stop)));
    };

    /** Backdrop a node paints on, plus whether a dark brand fill is in the chain. */
    const backdropOf = (element: Element) => {
      const chain: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) chain.push(node);

      let base: Rgb = { r: 255, g: 255, b: 255, a: 1 };
      let onBrandFill = false;
      // Composite from the page background inward so translucent layers stack.
      for (let index = chain.length - 1; index >= 0; index--) {
        const style = getComputedStyle(chain[index]);
        const stops = gradientStops(style.backgroundImage);
        if (stops.length > 0) {
          if (isBrandFill(style.backgroundImage)) onBrandFill = true;
          // Worst case for the text: the stop nearest to it in luminance.
          const worst = stops
            .map((stop) => compositeOver(stop, base))
            .sort((a, b) => contrastLuminanceDistance(a, base) - contrastLuminanceDistance(b, base))[0];
          base = worst;
        }
        const backgroundColor = toRgba(style.backgroundColor);
        if (backgroundColor && backgroundColor.a > 0) {
          if (brandStops.includes(toHex(compositeOver(backgroundColor, base)))) onBrandFill = true;
          base = compositeOver(backgroundColor, base);
        }
      }
      return { base, onBrandFill };
    };

    const luminance = (color: Rgb) => {
      const channel = (value: number) => {
        const srgb = value / 255;
        return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    };

    /** Distance in luminance between two colours; smaller means worse contrast. */
    const contrastLuminanceDistance = (a: Rgb, b: Rgb) => Math.abs(luminance(a) - luminance(b));

    const samples: TextSample[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const visited = new Set<Element>();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.nodeValue ?? '').trim();
      if (!text) continue;
      const element = node.parentElement;
      if (!element || visited.has(element)) continue;
      visited.add(element);
      if (element.closest('[aria-hidden="true"]')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (!(element as HTMLElement).offsetParent && style.position !== 'fixed') continue;

      const { base, onBrandFill } = backdropOf(element);
      const color = toRgba(style.color);
      if (!color) continue;

      samples.push({
        text: text.slice(0, 80),
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        fontSizePx: parseFloat(style.fontSize),
        lineHeight: style.lineHeight,
        color: compositeOver(color, base),
        backdrop: base,
        onBrandFill,
        // Emoji and other pictographs are non-text content under SC 1.4.11.
        pictographOnly: !/[\p{L}\p{N}]/u.test(text),
      });
    }
    return samples;
  }, { brandTokens: BRAND_FILL_TOKENS, rootSelector });
}

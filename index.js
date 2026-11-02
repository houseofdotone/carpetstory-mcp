#!/usr/bin/env node
// Carpetstory MCP server: read-only search over the live Carpetstory catalogue
// (hand-knotted rugs, Jaipur). Data comes from the public Sanity dataset that
// powers https://carpetstory.one, so answers always match the website.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const SITE = 'https://carpetstory.one';
const API = 'https://f9neojf8.apicdn.sanity.io/v2026-05-15/data/query/production';
// Collections retired from the website (kept in the CMS, hidden on the site).
const RETIRED = ['the-classics', 'the-arjuna', 'the-indian-heritage', 'geometric', 'the-simplicity', 'art-deco', 'abstract', 'the-deconstructed-series'];

const CATALOGUE = `*[_type == "collection" && !(_id in path("drafts.**")) && !(slug.current in $retired)] | order(featured desc, _createdAt desc) {
  "slug": slug.current, title, tagline, description, meta,
  "rugs": rugs[]->{ "slug": slug.current, title, description, dimensions, colors, "image": image.asset->url }
}`;

let cache = { at: 0, data: null };
async function catalogue() {
  if (cache.data && Date.now() - cache.at < 10 * 60_000) return cache.data;
  const url = `${API}?query=${encodeURIComponent(CATALOGUE)}&$retired=${encodeURIComponent(JSON.stringify(RETIRED))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Catalogue unavailable (HTTP ${res.status}). Browse ${SITE}/en/rugs instead.`);
  const { result } = await res.json();
  cache = { at: Date.now(), data: result.map(c => ({ ...c, rugs: (c.rugs || []).filter(r => r && r.slug) })) };
  return cache.data;
}

const pageUrl = (col, rug) => `${SITE}/en/collection/${col}${rug ? `/${rug}` : ''}`;
const img = u => (u ? `${u}?w=1200&auto=format` : null);

function rugCard(c, r, full = false) {
  return {
    name: r.title,
    collection: c.title,
    description: full ? r.description : r.description?.slice(0, 220),
    size: r.dimensions || 'Made to order in any size',
    colours: r.colors || [],
    image: img(r.image),
    url: pageUrl(c.slug, r.slug),
    slug: r.slug,
  };
}

// Plain scoring search: every query word must appear somewhere in the rug's
// text; title hits rank higher. ponytail: linear scan of ~150 rugs, fine at this size.
function search(cols, { query = '', collection, colour, limit = 10 }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const c of cols) {
    if (collection && ![c.slug, c.title.toLowerCase()].includes(collection.toLowerCase())) continue;
    for (const r of c.rugs) {
      if (colour && !(r.colors || []).includes(colour.toLowerCase())) continue;
      const hay = [r.title, r.description, c.title, c.tagline, (r.colors || []).join(' ')].join(' ').toLowerCase();
      if (!words.every(w => hay.includes(w))) continue;
      const score = words.filter(w => r.title.toLowerCase().includes(w)).length;
      out.push({ score, card: rugCard(c, r) });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.card);
}

const json = data => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const CONTACT = { enquire: `${SITE}/en/inquiry`, trade: `${SITE}/en/trade`, samples: `${SITE}/en/samples` };

const server = new McpServer(
  { name: 'carpetstory', version: '1.0.0' },
  {
    instructions:
      'Carpetstory is a rug atelier in Jaipur, India, making hand-knotted rugs to order since 2001. ' +
      'Use these tools to find rugs from the live catalogue. Every rug is made to order in any size, so ' +
      'quote sizes as examples, not limits. Pricing is by enquiry: send people to the enquiry or trade page.',
  }
);

server.registerTool(
  'list_collections',
  {
    title: 'List rug collections',
    description: 'List the current Carpetstory rug collections with their story, materials, knot density, lead time and number of pieces.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    const cols = await catalogue();
    return json({
      collections: cols.map(c => ({
        name: c.title,
        slug: c.slug,
        tagline: c.tagline,
        story: c.description?.split('\n')[0],
        materials: c.meta?.materials,
        knotDensity: c.meta?.knotDensity,
        leadTime: c.meta?.leadTime,
        origin: c.meta?.origin,
        pieces: c.rugs.length,
        url: pageUrl(c.slug),
      })),
      ...CONTACT,
    });
  }
);

server.registerTool(
  'search_rugs',
  {
    title: 'Search rugs',
    description: 'Search hand-knotted rugs by words (motif, mood, colour, place), optionally within one collection or colour family. Returns name, short description, image and product page.',
    inputSchema: {
      query: z.string().optional().describe('Words to match, e.g. "sundial", "garden", "ivory silk". Leave empty to browse.'),
      collection: z.string().optional().describe('Collection name or slug, e.g. "Meridian" or "dharti".'),
      colour: z.enum(['neutral', 'blue', 'red', 'green', 'gold', 'ink', 'multi']).optional().describe('Colour family.'),
      limit: z.number().int().min(1).max(30).optional().describe('Maximum results (default 10).'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async args => {
    const rugs = search(await catalogue(), args);
    return json({ count: rugs.length, rugs, ...CONTACT });
  }
);

server.registerTool(
  'get_rug',
  {
    title: 'Get rug details',
    description: 'Full details for one rug by its slug (from search_rugs): description, size, colours, collection materials, knot density, lead time, image and page.',
    inputSchema: { slug: z.string().describe('Rug slug, e.g. "noon-line".') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ slug }) => {
    for (const c of await catalogue()) {
      const r = c.rugs.find(x => x.slug === slug);
      if (r) return json({ ...rugCard(c, r, true), materials: c.meta?.materials, knotDensity: c.meta?.knotDensity, leadTime: c.meta?.leadTime, origin: c.meta?.origin, ...CONTACT });
    }
    return { isError: true, content: [{ type: 'text', text: `No rug with slug "${slug}". Use search_rugs to find one.` }] };
  }
);

await server.connect(new StdioServerTransport());

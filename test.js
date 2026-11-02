// End-to-end check: start the real server over stdio, list tools, call each one.
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'test', version: '0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ['index.js'] }));
const body = r => JSON.parse(r.content[0].text);

const { tools } = await client.listTools();
assert.deepEqual(tools.map(t => t.name).sort(), ['get_rug', 'list_collections', 'search_rugs']);

const cols = body(await client.callTool({ name: 'list_collections', arguments: {} })).collections;
assert.ok(cols.length >= 5, 'expected the live collections');
assert.ok(!cols.some(c => c.slug === 'the-classics'), 'retired collection leaked');

const all = body(await client.callTool({ name: 'search_rugs', arguments: { limit: 30 } }));
assert.equal(all.count, 30);
const hit = body(await client.callTool({ name: 'search_rugs', arguments: { query: 'noon line' } }));
assert.equal(hit.rugs[0].slug, 'noon-line');
assert.match(hit.rugs[0].url, /^https:\/\/carpetstory\.one\/en\/collection\/meridian\/noon-line$/);
const blue = body(await client.callTool({ name: 'search_rugs', arguments: { colour: 'blue', limit: 30 } }));
assert.ok(blue.rugs.every(r => r.colours.includes('blue')));

const rug = body(await client.callTool({ name: 'get_rug', arguments: { slug: 'noon-line' } }));
assert.equal(rug.collection, 'Meridian');
assert.ok(rug.knotDensity && rug.image);
const miss = await client.callTool({ name: 'get_rug', arguments: { slug: 'nope' } });
assert.equal(miss.isError, true);

await client.close();
console.log(`ok: ${cols.length} collections, ${cols.reduce((n, c) => n + c.pieces, 0)} rugs, blue=${blue.count}`);

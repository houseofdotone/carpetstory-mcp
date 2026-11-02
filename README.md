# Carpetstory MCP server

Search the [Carpetstory](https://carpetstory.one) rug catalogue from Claude, Cursor or any MCP client.

Carpetstory is a rug atelier in Jaipur, India, making hand-knotted rugs to order since 2001. This server reads the live catalogue behind [carpetstory.one](https://carpetstory.one), so every rug, image and link it returns is current. It is read-only and needs no API key.

## Tools

| Tool | What it does |
|---|---|
| `list_collections` | The current collections with their story, materials, knot density, lead time and number of pieces |
| `search_rugs` | Find rugs by words (motif, mood, colour, place), optionally within one collection or colour family |
| `get_rug` | Full details for one rug: description, size, colours, materials, knot density, image and product page |

Ask things like:

- "Show me Carpetstory rugs with a sundial or astronomy motif."
- "Which hand-knotted rugs come in blue, and how long do they take to make?"
- "Find an ivory and silk rug for a 9 × 12 ft living room."

Every rug is made to order in any size. Pricing is by enquiry through the [enquiry page](https://carpetstory.one/en/inquiry), and designers and architects can use the [trade programme](https://carpetstory.one/en/trade).

## Install

**Claude Desktop:** download `carpetstory.mcpb` from the [latest release](https://github.com/houseofdotone/carpetstory-mcp/releases/latest) and open it.

**Claude Code:**

```bash
claude mcp add carpetstory -- npx -y github:houseofdotone/carpetstory-mcp
```

**Cursor, Windsurf, Claude Desktop (manual) and other clients:**

```json
{
  "mcpServers": {
    "carpetstory": {
      "command": "npx",
      "args": ["-y", "github:houseofdotone/carpetstory-mcp"]
    }
  }
}
```

Requires Node.js 18 or newer.

## Develop

```bash
npm install
npm test   # starts the server over stdio and calls every tool against the live catalogue
```

## About Carpetstory

Hand-knotted rugs in wool and silk, designed and woven in Jaipur and made to order for homes, hotels and design studios worldwide. Browse the collections at [carpetstory.one](https://carpetstory.one) or, in Canada, [carpetstory.ca](https://carpetstory.ca).

MIT licensed.

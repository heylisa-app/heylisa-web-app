export type LisaFormatType = "message" | "prescription" | "report";

export type LisaBlock =
  | { type: "paragraph"; content: string }
  | { type: "title"; content: string }
  | { type: "list"; items: string[] }
  | { type: "section"; title: string; content: string }
  | { type: "rx_meta"; content: string }
  | { type: "rx"; content: string }
  | { type: "rx_notes"; content: string }
  | { type: "report_header"; content: string }
  | { type: "key_points"; items: string[] }
  | { type: "next_step"; content: string };

export interface LisaParsedMessage {
  format: LisaFormatType;
  blocks: LisaBlock[];
  raw: string;
}

function cleanText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function parseListItems(content: string): string[] {
  return cleanText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function extractFormat(text: string): {
  format: LisaFormatType;
  body: string;
} {
  const match = text.match(/^\s*\[FORMAT:(message|prescription|report)\]\s*/i);

  if (!match) {
    return {
      format: "message",
      body: text.trim(),
    };
  }

  const format = match[1].toLowerCase() as LisaFormatType;
  const body = text.slice(match[0].length).trim();

  return { format, body };
}

type TokenMatch =
  | { kind: "title"; match: RegExpExecArray }
  | { kind: "list"; match: RegExpExecArray }
  | { kind: "section"; match: RegExpExecArray }
  | { kind: "rx_meta"; match: RegExpExecArray }
  | { kind: "rx"; match: RegExpExecArray }
  | { kind: "rx_notes"; match: RegExpExecArray }
  | { kind: "report_header"; match: RegExpExecArray }
  | { kind: "key_points"; match: RegExpExecArray }
  | { kind: "next_step"; match: RegExpExecArray };

function getNextToken(text: string): TokenMatch | null {
  const patterns: Array<{
    kind: TokenMatch["kind"];
    regex: RegExp;
  }> = [
    { kind: "title", regex: /\[TITLE\]([\s\S]*?)\[\/TITLE\]/i },
    { kind: "list", regex: /\[LIST\]([\s\S]*?)\[\/LIST\]/i },
    {
      kind: "section",
      regex: /\[SECTION\s+title="([^"]+)"\]([\s\S]*?)\[\/SECTION\]/i,
    },
    { kind: "rx_meta", regex: /\[RX_META\]([\s\S]*?)\[\/RX_META\]/i },
    { kind: "rx", regex: /\[RX\]([\s\S]*?)\[\/RX\]/i },
    { kind: "rx_notes", regex: /\[RX_NOTES\]([\s\S]*?)\[\/RX_NOTES\]/i },
    {
      kind: "report_header",
      regex: /\[REPORT_HEADER\]([\s\S]*?)\[\/REPORT_HEADER\]/i,
    },
    { kind: "key_points", regex: /\[KEY_POINTS\]([\s\S]*?)\[\/KEY_POINTS\]/i },
    { kind: "next_step", regex: /\[NEXT_STEP\]([\s\S]*?)\[\/NEXT_STEP\]/i },
  ];

  let winner: TokenMatch | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (!match || match.index < 0) continue;

    if (match.index < bestIndex) {
      bestIndex = match.index;
      winner = {
        kind: pattern.kind,
        match,
      } as TokenMatch;
    }
  }

  return winner;
}

function pushParagraphs(blocks: LisaBlock[], content: string) {
  const cleaned = cleanText(content);
  if (!cleaned) return;

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => cleanText(p))
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    blocks.push({
      type: "paragraph",
      content: paragraph,
    });
  }
}

export function parseLisaMessage(raw: string): LisaParsedMessage {
  const source = typeof raw === "string" ? raw : "";
  const { format, body } = extractFormat(source);

  const blocks: LisaBlock[] = [];
  let cursor = body;

  while (cursor.length > 0) {
    const token = getNextToken(cursor);

    if (!token) {
      pushParagraphs(blocks, cursor);
      break;
    }

    const start = token.match.index;
    const fullMatch = token.match[0];

    if (start > 0) {
      pushParagraphs(blocks, cursor.slice(0, start));
    }

    switch (token.kind) {
      case "title":
        blocks.push({
          type: "title",
          content: cleanText(token.match[1] || ""),
        });
        break;

      case "list":
        blocks.push({
          type: "list",
          items: parseListItems(token.match[1] || ""),
        });
        break;

      case "section":
        blocks.push({
          type: "section",
          title: cleanText(token.match[1] || ""),
          content: cleanText(token.match[2] || ""),
        });
        break;

      case "rx_meta":
        blocks.push({
          type: "rx_meta",
          content: cleanText(token.match[1] || ""),
        });
        break;

      case "rx":
        blocks.push({
          type: "rx",
          content: cleanText(token.match[1] || ""),
        });
        break;

      case "rx_notes":
        blocks.push({
          type: "rx_notes",
          content: cleanText(token.match[1] || ""),
        });
        break;

      case "report_header":
        blocks.push({
          type: "report_header",
          content: cleanText(token.match[1] || ""),
        });
        break;

      case "key_points":
        blocks.push({
          type: "key_points",
          items: parseListItems(token.match[1] || ""),
        });
        break;

      case "next_step":
        blocks.push({
          type: "next_step",
          content: cleanText(token.match[1] || ""),
        });
        break;
    }

    cursor = cursor.slice(start + fullMatch.length);
  }

  return {
    format,
    blocks,
    raw: source,
  };
}
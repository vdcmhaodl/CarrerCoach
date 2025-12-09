'use client';

import React from 'react';

export interface ParsedSegment {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'code' | 'linebreak';
  content: string;
}

export function parseMarkdown(text: string): ParsedSegment[] {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.startsWith('\n')) {
      segments.push({ type: 'linebreak', content: '\n' });
      remaining = remaining.slice(1);
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^\*]+?)\*\*/);
    if (boldMatch) {
      segments.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const strikeMatch = remaining.match(/^~~([^~]+?)~~/);
    if (strikeMatch) {
      segments.push({ type: 'strikethrough', content: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^\*([^\*]+?)\*|^_([^_]+?)_/);
    if (italicMatch) {
      segments.push({ type: 'italic', content: italicMatch[1] || italicMatch[2] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      segments.push({ type: 'code', content: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const textMatch = remaining.match(/^[^\*~`\n]+/);
    if (textMatch) {
      segments.push({ type: 'text', content: textMatch[0] });
      remaining = remaining.slice(textMatch[0].length);
    } else {
      segments.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return segments;
}

export function renderMarkdown(segments: ParsedSegment[]): React.ReactNode[] {
  return segments.map((segment, index) => {
    switch (segment.type) {
      case 'bold':
        return <strong key={index}>{segment.content}</strong>;
      case 'italic':
        return <em key={index}>{segment.content}</em>;
      case 'strikethrough':
        return <s key={index}>{segment.content}</s>;
      case 'code':
        return (
          <code key={index} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            {segment.content}
          </code>
        );
      case 'linebreak':
        return <br key={index} />;
      case 'text':
      default:
        return <span key={index}>{segment.content}</span>;
    }
  });
}

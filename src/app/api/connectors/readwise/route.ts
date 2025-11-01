import { NextRequest, NextResponse } from "next/server";

const READWISE_BASE_URL = "https://readwise.io/api/v2";
const REQUEST_TIMEOUT = 1000 * 20;

type RequestPayload = {
  apiKey?: string;
  sourceType?: "kindle" | "apple_books";
  pageSize?: number;
};

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number }) {
  const { timeout = REQUEST_TIMEOUT, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, { ...rest, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request: NextRequest) {
  let body: RequestPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const apiKey = body.apiKey?.trim();
  const sourceType = body.sourceType;
  const pageSize = Math.min(Math.max(body.pageSize ?? 10, 1), 50);

  if (!apiKey) {
    return NextResponse.json(
      { error: "An API key is required." },
      { status: 400 }
    );
  }

  if (!sourceType) {
    return NextResponse.json(
      { error: "A sourceType must be provided." },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  } satisfies HeadersInit;

  try {
    const [booksResponse, highlightsResponse] = await Promise.all([
      fetchWithTimeout(
        `${READWISE_BASE_URL}/books/?source_type=${sourceType}&page_size=${pageSize}`,
        {
          method: "GET",
          headers,
        }
      ),
      fetchWithTimeout(
        `${READWISE_BASE_URL}/highlights/?source_type=${sourceType}&page_size=${pageSize}`,
        {
          method: "GET",
          headers,
        }
      ),
    ]);

    if (booksResponse.status === 401 || highlightsResponse.status === 401) {
      return NextResponse.json(
        { error: "Readwise rejected the token. Double-check the API key." },
        { status: 401 }
      );
    }

    if (!booksResponse.ok) {
      const error = await booksResponse.text();
      console.error("Readwise books error", error);
      return NextResponse.json(
        { error: "Unable to fetch books from Readwise." },
        { status: booksResponse.status }
      );
    }

    if (!highlightsResponse.ok) {
      const error = await highlightsResponse.text();
      console.error("Readwise highlights error", error);
      return NextResponse.json(
        { error: "Unable to fetch highlights from Readwise." },
        { status: highlightsResponse.status }
      );
    }

    const booksPayload = await booksResponse.json();
    const highlightsPayload = await highlightsResponse.json();

    const books = Array.isArray(booksPayload?.results)
      ? booksPayload.results.map((book: any) => ({
          id: String(book.id ?? ""),
          title: String(book.title ?? "Untitled"),
          author: String(book.author ?? ""),
          lastHighlightAt: book.last_highlight_at ?? null,
          numHighlights: Number(book.num_highlights ?? 0),
        }))
      : [];

    const highlights = Array.isArray(highlightsPayload?.results)
      ? highlightsPayload.results.map((highlight: any) => ({
          id: String(highlight.id ?? ""),
          text: String(highlight.text ?? ""),
          bookTitle: String(highlight.title ?? highlight.book_title ?? ""),
          author: String(highlight.author ?? ""),
          highlightedAt: highlight.highlighted_at ?? highlight.updated_at ?? null,
          location: highlight.location ?? null,
        }))
      : [];

    const notes = Array.isArray(highlightsPayload?.results)
      ? highlightsPayload.results.filter((highlight: any) => Boolean(highlight.note)).length
      : 0;

    const responsePayload = {
      syncedAt: new Date().toISOString(),
      totals: {
        books: booksPayload?.count ?? books.length,
        highlights: highlightsPayload?.count ?? highlights.length,
        notes,
      },
      books,
      highlights,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Readwise request timed out. Try again in a moment." },
        { status: 504 }
      );
    }

    console.error("Readwise connector error", error);
    return NextResponse.json(
      { error: "Unexpected error while talking to Readwise." },
      { status: 500 }
    );
  }
}

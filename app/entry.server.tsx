import { renderToReadableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import type { EntryContext } from "react-router";

export default async function handleRequest(
    request: Request,
    status: number,
    headers: Headers,
    context: EntryContext
): Promise<Response> {
    headers.set("Content-Type", "text/html");

    const stream = await renderToReadableStream(
        <ServerRouter
            context={context}
            url={new URL(request.url).pathname} // ✅ use `url` instead of `location`
        />,
        {
            signal: request.signal,
        }
    );

    return new Response(stream, {
        status,
        headers,
    });
}
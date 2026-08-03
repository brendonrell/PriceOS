/*
 * /drops/[project] — the public Fair Draw transcript page.
 *
 * One page per contested drop: the published transcript, the on-chain
 * commitment, and a verifier that runs in the reader's own browser
 * (components/drops/DrawTranscriptView). The trust product — a stranger
 * needs nothing from PD but this URL to check the draw.
 */

import DrawTranscriptView from '@/components/drops/DrawTranscriptView';

export const dynamic = 'force-dynamic';

export default async function DropTranscriptPage(
    { params }: { params: Promise<{ project: string }> },
) {
    const { project } = await params;
    return (
        <main className="ddt-page">
            <h1 className="ddt-h1">FAIR DRAW — the public record</h1>
            <p className="ddt-sub">
                Every contested drop on PD publishes its full draw here. Verify it
                yourself: your browser replays the draw and checks it against the
                commitment anchored on Ethereum — PD is not part of the answer.
            </p>
            <DrawTranscriptView project={project.toLowerCase()} />
        </main>
    );
}

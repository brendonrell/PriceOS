// Shell — delta port from Collection.
export default function ArtistPage({
  params,
}: {
  params: { handle: string };
}) {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        artist
      </h1>
      <p className="proof-status">
        <strong>/artist/{params.handle}</strong>
        <br />
        Route resolves. Delta port from Collection.
      </p>
    </main>
  );
}

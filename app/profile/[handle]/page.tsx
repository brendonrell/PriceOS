// Shell — will be derived from collection port as a delta in D3.
export default function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        profile
      </h1>
      <p className="proof-status">
        <strong>/profile/{params.handle}</strong>
        <br />
        Route resolves. Delta port from Collection.
      </p>
    </main>
  );
}

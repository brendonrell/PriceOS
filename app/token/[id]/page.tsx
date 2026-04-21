// Shell — delta port from Collection.
export default function TokenPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        token
      </h1>
      <p className="proof-status">
        <strong>/token/{params.id}</strong>
        <br />
        Route resolves. Delta port from Collection.
      </p>
    </main>
  );
}

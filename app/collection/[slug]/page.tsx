// Shell — will be ported from collection.html in D2.
export default function CollectionPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        collection
      </h1>
      <p className="proof-status">
        <strong>/collection/{params.slug}</strong>
        <br />
        Route resolves. Port target for D2.
      </p>
    </main>
  );
}

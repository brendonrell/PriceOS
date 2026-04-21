// Shell — dedicated mint flow, TBD in later sprint.
export default function MintPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="proof">
      <h1 className="proof-logo">
        mint
      </h1>
      <p className="proof-status">
        <strong>/mint/{params.slug}</strong>
        <br />
        Route resolves. TBD.
      </p>
    </main>
  );
}

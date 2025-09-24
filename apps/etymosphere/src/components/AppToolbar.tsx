export function AppToolbar() {
  return (
    <section className="panel" aria-labelledby="tools-heading">
      <div className="panel-header">
        <h2 id="tools-heading">Tools</h2>
        <p>Quick actions for exporting and sharing analyses will arrive later in the build.</p>
      </div>
      <div className="panel-body">
        <button type="button" className="toolbar-button" disabled aria-disabled="true">
          Export Markdown (planned)
        </button>
        <p className="panel-note">Clipboard + download workflow will be implemented in S6.</p>
      </div>
    </section>
  );
}

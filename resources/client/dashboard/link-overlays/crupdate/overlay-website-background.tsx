export function OverlayWebsiteBackground() {
  return (
    <div className="h-full overflow-hidden rounded-card bg">
      <div className="navbar flex h-9 w-full items-center bg-black/70 dark:border-b dark:bg-muted">
        <div
          className="os-button ml-2.5 size-3.5 rounded-full"
          style={{background: '#d7665d'}}
        />
        <div
          className="os-button ml-2.5 size-3.5 rounded-full"
          style={{background: '#deab54'}}
        />
        <div
          className="os-button ml-2.5 size-3.5 rounded-full"
          style={{background: '#6fb54c'}}
        />
      </div>

      <div className="page-body p-6">
        <div className="top-row mb-6 flex h-15 items-center rounded-card bg-secondary p-2.5">
          <div className="circle mr-auto h-10 w-10 rounded-full bg-foreground/8"></div>
          <div className="line ml-3.5 h-5 w-1/6 rounded-sm bg-foreground/8" />
          <div className="line ml-3.5 h-5 w-1/6 rounded-sm bg-foreground/8" />
          <div className="line ml-3.5 h-5 w-1/6 rounded-sm bg-foreground/8" />
        </div>

        <div className="middle-row my-6 flex h-65 flex-col items-center justify-center rounded-card bg-secondary">
          <div className="line mb-5 h-9 w-3/5 rounded-sm bg-foreground/8" />
          <div className="line mb-1 h-3.5 w-1/2 rounded-sm bg-foreground/6" />
          <div className="line mb-1 h-3.5 w-1/2 rounded-sm bg-foreground/6" />
          <div className="line mb-1 h-3.5 w-1/2 rounded-sm bg-foreground/6" />
        </div>

        <div className="flex-container flex">
          <div className="left w-1/3">
            <div className="rect mb-1.5 h-36 rounded-sm bg-foreground/6" />
            <div className="line fat-line mb-2.5 h-9 rounded-sm bg-foreground/6" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="separator my-6 h-px bg-border"></div>
            <div className="rect mb-2.5 h-36 bg-foreground/6" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="rect mb-1.5 h-36 bg-foreground/6" />
          </div>

          <div className="right w-2/3 pl-6">
            <div className="rect mb-8 h-72 rounded-sm bg-foreground/6" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="line fat-line mb-2.5 h-9 rounded-sm bg-foreground/6" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="separator my-6 h-px bg-border" />
            <div className="line mb-2.5 h-5 rounded-sm bg-foreground/8" />
            <div className="rect mb-8 h-72 bg-foreground/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

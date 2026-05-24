interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--card)] flex items-center px-4 lg:px-6 sticky top-0 z-30 transition-colors duration-200">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] md:hidden transition-colors"
        style={{ borderRadius: 0 }}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>
  );
}

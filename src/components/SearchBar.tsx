type SearchBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
};

export default function SearchBar({
  searchQuery,
  onSearchChange,
  onClear,
}: SearchBarProps) {
  const hasQuery = searchQuery.length > 0;

  return (
    <div className="relative mb-4">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Type to search..."
        className="w-full min-w-0 rounded border p-2 pr-10"
      ></input>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        title="Clear search"
        className={`absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded cursor-pointer transition-opacity duration-200 ${
          hasQuery
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

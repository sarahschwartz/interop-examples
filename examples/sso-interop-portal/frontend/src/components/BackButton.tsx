import type { Tab } from "~/utils/tabs";

interface Props {
  setActiveTab: (next: Tab) => void;
}

export function BackButton({ setActiveTab }: Props) {
  return (
    <button
      className="back-button"
      onClick={() => setActiveTab("Home")}
      type="button"
      aria-label="Back to Home"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.5 15L7.5 10L12.5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

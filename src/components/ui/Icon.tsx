import type { SVGProps } from "react";
const paths = {
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  search: "m21 21-5-5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  external:
    "M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4",
  list: "M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  browser: "M3 8h18M6 5h.01M9 5h.01M3 3h18v18H3Z",
  logout: "M9 5H4v14h5m7-14 5 7-5 7M9 12h12",
  file: "M14 2H4v20h16V8Zm0 0v6h6M8 12h8M8 16h5",
};
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 3v26M3 16h26M6.8 6.8l18.4 18.4M6.8 25.2 25.2 6.8"
        stroke="currentColor"
        strokeWidth="3.6"
      />
    </svg>
  );
}

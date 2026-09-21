import type { AppProps } from "next/app";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("alivemonitor-theme");
    const theme = savedTheme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <style>{`
        html, body { min-height: 100%; }
        body { margin: 0; background: #f2f2f0; color: #171717; transition: background .2s ease, color .2s ease; }
        body[data-theme="dark"] { background: #171717; color: #f4f4f1; }
        body[data-theme="dark"] input { color-scheme: dark; }
        body[data-theme="dark"] .monitor-page { color: #f4f4f1; }
        body[data-theme="dark"] .monitor-page input { border-color: #4a4a46 !important; background: #1f1f1e !important; color: #f4f4f1 !important; }
        body[data-theme="dark"] .monitor-page > button { border-color: #454541 !important; background: #292928 !important; color: #f4f4f1 !important; }
        body[data-theme="dark"] .monitor-page > div { border-color: #454541 !important; background: #242422 !important; color: #f4f4f1 !important; }
        body[data-theme="dark"] .monitor-page > div > div { border-color: #454541 !important; background: #30302e !important; }
        body[data-theme="dark"] .monitor-page span { color: #aaa9a3 !important; }
      `}</style>
    </>
  );
}

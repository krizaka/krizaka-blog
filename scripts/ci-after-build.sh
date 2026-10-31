#!/usr/bin/env bash
# What only this site checks, run by the shared node-ci (input `after-build`) once the CLOSED build exists: what is served before
# the first post is published, then the OPEN build (indexing on, drafts in, so every kind of page exists) with the family's SEO
# contract, the links, the layout in a real browser, the feeds, the Open Graph images and the stubs of removed addresses.
set -euo pipefail

echo "::group::Closed means closed"
grep -q "Disallow: /$" out/robots.txt
grep -q 'name="robots" content="noindex' out/index.html
test -f out/index.html && test -f out/fr/index.html && test -f out/feed.xml && test -f out/fr/atom.xml && test -f out/llms.txt && test -f out/sitemap.xml && test -f out/admin/index.html && test -f out/admin/config.yml
echo "::endgroup::"

echo "::group::Build, open, with the drafts"
APP_INDEXING_ENABLED=true APP_SHOW_DRAFTS=1 npm run build
echo "::endgroup::"

echo "::group::What search engines read on every page (title <= 60, description <= 155, one h1, alt on every image, no NaN)"
node scripts/check-meta.mjs out
echo "::endgroup::"

echo "::group::The family's SEO contract, every link, the layout"
npm install --no-save --ignore-scripts --no-audit --no-fund serve@14.2.6
node_modules/.bin/serve out -l 3000 >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -sf http://localhost:3000/robots.txt >/dev/null && break; sleep 1; done
node scripts/check-seo-family.mjs --base http://localhost:3000 --host https://blog.krizaka.com --index on --limit 60
node scripts/check-links.mjs --base http://localhost:3000 --host https://blog.krizaka.com --external
node_modules/.bin/playwright install --with-deps chromium
node scripts/check-layout.mjs --base http://localhost:3000 --posts out
echo "::endgroup::"

echo "::group::Reading offline: every chapter is saveable and in the service worker's precache, and a saved chapter opens with no network"
node scripts/check-offline.mjs
node scripts/check-offline-reading.mjs --base http://localhost:3000 --out out
echo "::endgroup::"

echo "::group::Downloads: the EPUB and the PDF of every chapter and of the series, in each language, each checked"
# pandoc 3.13 (the EPUB), pinned by its checksum; Chromium (the PDF) is the one Playwright installed above.
if ! command -v pandoc >/dev/null || [[ "$(pandoc --version | head -1)" != "pandoc 3.13" ]]; then
  curl --proto "=https" --tlsv1.2 -fsSL -o /tmp/pandoc.deb https://github.com/jgm/pandoc/releases/download/3.13/pandoc-3.13-1-amd64.deb
  echo "7e3736f255090296ca5d1a14291a76b9b3c43cd385011b1621a4d0c16091a70f  /tmp/pandoc.deb" | sha256sum -c -
  sudo dpkg -i /tmp/pandoc.deb
fi
# epubcheck 5.2.1 (W3C, Java is on the runner): every EPUB must validate with no error and no warning (gen-downloads runs it).
curl --proto "=https" --tlsv1.2 -fsSL -o /tmp/epubcheck.zip https://github.com/w3c/epubcheck/releases/download/v5.2.1/epubcheck-5.2.1.zip
echo "0532f6291faa2bb729dd253f958868a2a57dbd2c32f881a97c7c980c5940309e  /tmp/epubcheck.zip" | sha256sum -c -
unzip -q -o /tmp/epubcheck.zip -d /tmp
EPUBCHECK_JAR=/tmp/epubcheck-5.2.1/epubcheck.jar node scripts/gen-downloads.mjs --out downloads-out
node scripts/gen-downloads.mjs check
grep -q '<enclosure url="https://krizaka-assets.b-cdn.net/sites/blog/posts/downloads/' out/feed.xml
grep -q 'rel="enclosure" type="application/pdf"' out/fr/atom.xml
grep -q '"attachments"' out/feed.json
echo "::endgroup::"

echo "::group::Core Web Vitals budget (LCP <= 2.5 s, CLS <= 0.1, phone window, CPU x4)"
node scripts/check-vitals.mjs --base http://localhost:3000 --posts out
echo "::endgroup::"

echo "::group::The feeds are pure XML a reader accepts (no XSLT); the old /feed/ page is a stub to the story"
for f in out/feed.xml out/fr/feed.xml out/atom.xml out/fr/atom.xml; do python3 -c "import sys, xml.dom.minidom as m; m.parse(sys.argv[1])" "$f"; done
! grep -q 'xml-stylesheet' out/feed.xml out/fr/feed.xml out/atom.xml out/fr/atom.xml
test ! -e out/feed.xsl
grep -q 'http-equiv="refresh" content="0; url=/"' out/feed/index.html
grep -q 'http-equiv="refresh" content="0; url=/fr/"' out/fr/feed/index.html
for p in out/index.html out/fr/index.html; do grep -q 'id="subscribe"' "$p"; done
grep -q 'href="#subscribe"' out/basics/understanding-ai-before-you-start/index.html
grep -q 'id="subscribe"' out/basics/understanding-ai-before-you-start/index.html
echo "::endgroup::"

echo "::group::Open Graph images, feeds listing, retired addresses"
test -f out/og/understanding-ai-before-you-start.png && test -f out/fr/og/understanding-ai-before-you-start.png
grep -q "/story/what-a-gpu-costs/" out/feed.xml && grep -q "/fr/story/what-a-gpu-costs/" out/fr/atom.xml
grep -q 'http-equiv="refresh" content="0; url=/story/what-a-gpu-costs/"' out/posts/what-image-and-video-generation-costs/index.html
for p in story series tags search saved feed posts; do
  grep -q 'http-equiv="refresh" content="0; url=/"' "out/$p/index.html"
  grep -q 'http-equiv="refresh" content="0; url=/fr/"' "out/fr/$p/index.html"
done
grep -q 'http-equiv="refresh" content="0; url=/story/what-a-gpu-costs/"' out/tags/costs/index.html
echo "::endgroup::"

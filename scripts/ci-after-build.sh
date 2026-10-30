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

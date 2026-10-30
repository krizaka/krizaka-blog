/* out/build.json: the commit the build was made from. The post-deploy workflow (krizaka/.github post-deploy.yml) polls the
   live site for it, so IndexNow and the SEO guard run only once the new build is served. DigitalOcean passes the commit as
   APP_COMMIT (.do/app.yaml, `${_self.COMMIT_HASH}`); a local build says "local". Pure and tested (tests/build-info.test.mjs). */
export function buildInfo(commit) {
  const value = String(commit ?? "").trim();
  return { commit: /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : "local" };
}

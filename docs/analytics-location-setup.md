# Linket location analytics: operator setup and verification

The Top Locations chart reads countries and cities captured on new tracking events. **IP geolocation is approximate**. Private IPs, untrusted proxy headers, an unavailable database, and privacy proxies can legitimately produce "Unknown location".

## MaxMind database (country/city lookup)

Linket uses Torann GeoIP with the local MaxMind GeoLite2 City database in storage/app/geoip.mmdb. Composer alone does not install the database.

1. Obtain a MaxMind GeoLite license key and set MAXMIND_LICENSE_KEY in the deployment environment. Never commit it.
2. Run php artisan geoip:update from the deployed release and verify the database exists and is readable by PHP.
3. Keep the database in persistent/shared storage across releases and schedule a periodic update (for example weekly); check the logs for failures.
4. If stale unknown lookups remain, php artisan geoip:clear works with tag-supporting cache drivers. For file/database caches use your established cache maintenance process instead.
5. Verify via a known public test IP, such as geoip('8.8.8.8')->iso_code, then check a newly recorded real visitor click.

## Reverse proxies and Cloudflare

- Laravel's request()->ip() is used for visitor IP attribution. Configure TRUSTED_PROXIES with the addresses/CIDRs of actual ingress proxies. Do not trust arbitrary forwarded headers or use a wildcard on a publicly reachable origin.
- Optional: if a known ingress proxy sends CF-IPCountry, set GEOIP_TRUSTED_COUNTRY_PROXIES to comma-separated direct peer IP/CIDR ranges. CF-IPCountry is rejected unless the actual REMOTE_ADDR matches the allowlist.
- For Cloudflare deployments, maintain the current official Cloudflare edge CIDRs in that allowlist, or let a strictly controlled origin proxy add the header. Restrict direct origin access.
- Country codes XX, T1 and EU are intentionally not mapped to countries. City is suppressed if the verified edge country differs from local GeoIP.

## Validation checklist

- A real public visitor behind the configured proxy resolves to a real country on a new tracked event.
- Spoofed X-Forwarded-For and CF-IPCountry from untrusted peers cannot override the country.
- Private/loopback IPs remain unresolved rather than mapping to a fabricated country.
- Top Locations renders a wide map for known countries, includes Unknown as an explicit list entry, and does not map Unknown.
- Clicking a country restricts the city report to that country.
- Confirm at 390px mobile, desktop, and dark mode.

## Existing records

Events stored as Unknown cannot safely be reassigned without a trustworthy original visitor IP. Never backfill using the server's proxy IP: that would report the proxy's country rather than the visitor's. This change fixes new capture; it does not rewrite historic event data, alter payments, or request GPS permission.

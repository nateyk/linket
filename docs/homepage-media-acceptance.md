# Linket homepage — media acceptance checklist

## Brand and layout
- Use Linket Blue `#0049CC` and the existing light/dark theme tokens; avoid introducing an unrelated accent palette.
- Use consistent illustration perspective, weight, and lighting across ebooks, downloads, courses, and services.
- Select reusable assets from a **single licensed IconScout family** when possible. Preview URLs are not production assets. Keep records of the asset slug, creator, download rights, attribution obligations, and export format.
- Prepare optimized SVG/WebP/AVIF exports and upload them through **Admin → Landing page → Product showcase cards → Product illustration**. Never hotlink a paid/unlicensed CDN preview.

## Genuine storefront captures
- On a real Linket test creator profile, capture a desktop storefront/builder view and a 390px mobile public storefront after making changes in the app.
- Hide email, phone, payment credentials, access tokens, customers' personal details and internal URLs. Use approved sample products; label illustration/demo imagery accurately until replaced.
- Upload the desktop screenshot to the storefront section's main image and mobile screenshot to its optional mobile media field. Write meaningful alternative text.
- Confirm screenshot rendering at 360px, 390px, 768px and desktop. Check light/dark mode and 200% zoom.

## Checkout and payouts
- Capture a legitimate Chapa TEST checkout for an eligible digital product. Do **not** label a sandbox screenshot as a confirmed production payout.
- Check that orders become paid only after verified payment, product access follows confirmation, and eligible withdrawals are subject to approval and verified settlement.
- Keep the screenshot and explanatory copy separate from private creator bank/wallet data and buyer information.

## Creator stories and consent
- Use real publicly accessible Linket storefront paths and screenshots. Obtain creator approval before publishing the page, name or endorsement.
- Quotes are optional and must reflect an actual supplied statement. Do not invent sales totals, ratings or earnings.
- The **Creator stories** section starts empty; entries stay hidden until a name, image, safe same-site path and explicit approval are present.

## Final CTA and performance
- Prefer the new lightweight SVG stars over a persistent full-screen GPU canvas.
- Verify keyboard focus, readable contrast, `prefers-reduced-motion`, responsive typography and stable layout.
- Finish a manual preview before merging the homepage PRs; CI passing does not replace browser visual acceptance.

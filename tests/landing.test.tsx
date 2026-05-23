import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { LandingHero } from "../app/_components/landing-hero";
import { FeatureBlurbs } from "../app/_components/feature-blurbs";

describe("landing_renders_brand_and_cta", () => {
  it("renders LandingHero with 'Streak' as the H1 and a 'Get started' link to /sign-up", () => {
    const html = renderToStaticMarkup(<LandingHero />);

    // The product name appears in an <h1>.
    expect(html).toMatch(/<h1[^>]*>[^<]*Streak[^<]*<\/h1>/);

    // A link with accessible name 'Get started' points at /sign-up.
    // The CTA is a shadcn Button rendered as an <a>; its text content is
    // 'Get started' and its href is /sign-up.
    const ctaPattern =
      /<a[^>]*href="\/sign-up"[^>]*>[\s\S]*?Get started[\s\S]*?<\/a>/;
    expect(html).toMatch(ctaPattern);

    // Value prop is visible.
    expect(html).toContain("Build daily habits");
    expect(html).toContain("Watch your streak grow");
  });
});

describe("feature_blurbs_three_items", () => {
  it("renders the three feature labels", () => {
    const html = renderToStaticMarkup(<FeatureBlurbs />);
    expect(html).toContain("Add habits");
    expect(html).toContain("Check them off");
    expect(html).toContain("Watch your streak");
  });
});

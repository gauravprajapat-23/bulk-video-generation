/**
 * Predefined CSV templates for common YouTube content types.
 *
 * COLUMN NAMING RULES:
 *  - Content columns come FIRST and must match template {{placeholders}} exactly.
 *  - SEO columns come LAST using standardized YouTube field names.
 *  - "video_title" is the YouTube video title.
 *  - "description" is the YouTube video description.
 *  - "publish_at" is the scheduled publish time (ISO 8601).
 *
 * This keeps the two concerns separate and prevents header name conflicts.
 */

export interface CsvTemplate {
  name: string;
  description: string;
  /** Content columns that map to template {{placeholders}} */
  contentHeaders: string[];
  /** YouTube SEO columns (always appended after content) */
  seoHeaders: string[];
  /** Combined list for display / CSV generation */
  headers: string[];
  sampleRow: Record<string, string>;
}

// ── SEO columns shared by every template ────────────────────────────
const SEO_COLS = [
  "video_title",
  "description",
  "tags",
  "hashtags",
  "category_id",
  "visibility",
  "made_for_kids",
  "language",
  "publish_at",
] as const;

const SEO_SAMPLE: Record<string, string> = {
  video_title: "",
  description: "",
  tags: "",
  hashtags: "",
  category_id: "22",
  visibility: "private",
  made_for_kids: "false",
  language: "en",
  publish_at: "",
};

function tpl(
  name: string,
  description: string,
  contentHeaders: string[],
  contentSample: Record<string, string>,
): CsvTemplate {
  const headers = [...contentHeaders, ...SEO_COLS];
  return {
    name,
    description,
    contentHeaders,
    seoHeaders: [...SEO_COLS],
    headers,
    sampleRow: { ...contentSample, ...SEO_SAMPLE },
  };
}

export const CSV_TEMPLATES: Record<string, CsvTemplate> = {
  // ── Original templates ────────────────────────────────────────────
  shorts_viral: tpl(
    "Viral Shorts",
    "Quick, engaging shorts designed for maximum reach",
    ["headline", "subheadline", "cta"],
    {
      headline: "Did you know?",
      subheadline: "This changes everything",
      cta: "Watch Now",
      video_title: "Did You Know This? 🤯",
      description:
        "This amazing fact will blow your mind! Watch till the end for the surprising twist.",
      tags: "facts,didyouknow,amazing,viral,shorts",
      hashtags: "facts didyouknow viral shorts",
    },
  ),

  tutorial_series: tpl(
    "Tutorial Series",
    "Step-by-step educational content",
    ["headline", "subheadline", "step_number", "total_steps"],
    {
      headline: "Step 1: Setup",
      subheadline: "Getting started",
      step_number: "1",
      total_steps: "5",
      video_title: "How to Setup [Topic] - Step 1/5",
      description:
        "Part 1 of our complete guide. Follow along step by step!",
      tags: "tutorial,howto,guide,learning,education",
      hashtags: "tutorial howto learning",
      category_id: "27",
    },
  ),

  daily_quotes: tpl(
    "Daily Quotes",
    "Inspirational and motivational quotes",
    ["quote", "author", "category"],
    {
      quote: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
      category: "Motivation",
      video_title: "Steve Jobs Motivational Quote 💪",
      description:
        "Daily motivation from Steve Jobs. Let this quote inspire your day!",
      tags: "quotes,motivation,stevejobs,inspiration,daily",
      hashtags: "quotes motivation daily",
    },
  ),

  facts_countdown: tpl(
    "Facts Countdown",
    "Countdown-style fact videos (Top 10, etc.)",
    ["headline", "days_left"],
    {
      headline: "Fact #1",
      days_left: "10",
      video_title: "Top 10 Amazing Facts 🧠",
      description:
        "Number 1 will shock you! These facts are unbelievable.",
      tags: "facts,amazing,trivia,top10,interesting",
      hashtags: "facts amazing trivia",
    },
  ),

  // ── Premium templates ─────────────────────────────────────────────
  product_showcase: tpl(
    "Product Showcase",
    "Premium product launch and e-commerce content",
    ["brand", "product_name", "product_description", "price", "original_price", "cta", "tagline"],
    {
      brand: "LUXE",
      product_name: "Midnight Collection Watch",
      product_description:
        "Crafted from surgical-grade titanium with sapphire crystal glass. 72-hour power reserve.",
      price: "$299",
      original_price: "$499",
      cta: "Shop Now",
      tagline: "Timeless elegance, redefined.",
      video_title: "LUXE Midnight Collection - Now Available ⌚",
      description:
        "Introducing the Midnight Collection. Premium craftsmanship at an exclusive launch price.",
      tags: "luxury,watches,fashion,style,premium",
      hashtags: "luxurywatches fashion premium",
    },
  ),

  podcast_clips: tpl(
    "Podcast Clips",
    "Short-form podcast highlight reels",
    ["episode", "guest_name", "guest_title", "quote", "platform", "podcast_name"],
    {
      episode: "47",
      guest_name: "Sarah Chen",
      guest_title: "CEO at TechForward",
      quote:
        "The best time to start building was yesterday. The second best time is now.",
      platform: "Spotify & Apple Podcasts",
      podcast_name: "The Growth Mindset",
      video_title: "Sarah Chen on Building a Startup 🎙️",
      description:
        "Best moments from Episode 47 with Sarah Chen. Full episode in bio!",
      tags: "podcast,startup,motivation,interview,business",
      hashtags: "podcast startup motivation",
    },
  ),

  promo_sale: tpl(
    "Promotional Sale",
    "Flash sales, discounts, and limited-time offers",
    ["discount", "product_name", "original_price", "sale_price", "time_left", "cta", "promo_code"],
    {
      discount: "50%",
      product_name: "Premium Headphones",
      original_price: "$199",
      sale_price: "$99",
      time_left: "24:00:00",
      cta: "Buy Now",
      promo_code: "SAVE50",
      video_title: "50% OFF Premium Headphones 🔥",
      description:
        "Flash sale! Premium noise-cancelling headphones at half price. Limited stock!",
      tags: "sale,deal,discount,headphones,flashsale",
      hashtags: "sale deal discount",
    },
  ),

  this_or_that: tpl(
    "This or That",
    "Interactive poll with two options",
    ["option_a", "option_b", "context"],
    {
      option_a: "Morning workouts",
      option_b: "Late night sessions",
      context: "Which schedule keeps you consistent?",
      video_title: "This or That? Pick Your Side! 🗳️",
      description:
        "Comment A or B! Which do you prefer? Follow for more polls.",
      tags: "poll,interactive,thisorthat,engagement,debate",
      hashtags: "thisorthat poll engagement",
    },
  ),

  big_stat: tpl(
    "Big Stat / Number Drop",
    "Data-driven content with oversized numbers",
    ["stat_label", "big_number", "unit", "context", "source"],
    {
      stat_label: "GLOBAL USERS",
      big_number: "2.7B",
      unit: "Active Users Worldwide",
      context:
        "Social media usage has exploded in the last decade, connecting people across every continent.",
      source: "Statista 2024",
      video_title: "2.7 Billion Users! 📊 The Number That Changes Everything",
      description:
        "The numbers behind the social media boom. Data that will surprise you.",
      tags: "data,statistics,socialmedia,trends,bignumber",
      hashtags: "data statistics trends",
    },
  ),

  brand_story: tpl(
    "Brand Story",
    "Elegant brand narrative with mission and values",
    ["brand_name", "year", "mission", "values", "cta"],
    {
      brand_name: "AURORA",
      year: "2019",
      mission:
        "We believe technology should empower, not overwhelm. Our tools are designed for humans first.",
      values: "Innovation · Simplicity · Sustainability",
      cta: "Join the Movement",
      video_title: "The Story Behind AURORA 🏛️",
      description:
        "From a garage startup to a global brand. This is our story.",
      tags: "brand,story,startup,mission,values",
      hashtags: "brandstory startup mission",
    },
  ),

  team_spotlight: tpl(
    "Team Spotlight",
    "Team member bio card with avatar, role, and fun fact",
    ["initials", "name", "role", "bio", "fun_fact", "social_handle"],
    {
      initials: "JD",
      name: "Jane Doe",
      role: "Head of Design",
      bio: "10+ years crafting user experiences. Previously at Figma and Stripe.",
      fun_fact: "Has visited 42 countries and counting.",
      social_handle: "@janedoe_design",
      video_title: "Meet Jane Doe - Our Design Lead 👤",
      description:
        "Get to know the creative mind behind our product design.",
      tags: "team,spotlight,design,meettheteam",
      hashtags: "meettheteam spotlight",
    },
  ),

  stats_dashboard: tpl(
    "Statistics Dashboard",
    "Four-card stat grid with labels, values, and changes",
    [
      "title",
      "stat_1_label", "stat_1_value", "stat_1_change",
      "stat_2_label", "stat_2_value", "stat_2_change",
      "stat_3_label", "stat_3_value", "stat_3_change",
      "stat_4_label", "stat_4_value", "stat_4_change",
      "insight", "period",
    ],
    {
      title: "Q4 Performance Report",
      stat_1_label: "REVENUE",
      stat_1_value: "$2.4M",
      stat_1_change: "+18% vs Q3",
      stat_2_label: "USERS",
      stat_2_value: "142K",
      stat_2_change: "+24% vs Q3",
      stat_3_label: "RETENTION",
      stat_3_value: "89%",
      stat_3_change: "+5% vs Q3",
      stat_4_label: "NPS",
      stat_4_value: "72",
      stat_4_change: "+8 pts vs Q3",
      insight: "Short-form video drove 60% of new user acquisition this quarter.",
      period: "October – December 2024",
      video_title: "Q4 Results: $2.4M Revenue 📈",
      description:
        "Our Q4 performance dashboard. Revenue, users, retention, and NPS all up.",
      tags: "analytics,dashboard,performance,q4,results",
      hashtags: "analytics performance results",
      category_id: "28",
    },
  ),

  meme_trending: tpl(
    "Meme / Trending",
    "Classic top-text bottom-text meme format",
    ["top_text", "bottom_text", "watermark"],
    {
      top_text: "WHEN THE CODE WORKS ON THE FIRST TRY",
      bottom_text: "BUT YOU DIDN'T CHANGE ANYTHING",
      watermark: "@yourchannel",
      video_title: "When the Code Just Works 😂",
      description:
        "Every developer knows this feeling. Tag a dev friend!",
      tags: "meme,funny,developer,tech,trending",
      hashtags: "meme funny developer",
    },
  ),

  // ── Multi-page templates ──────────────────────────────────────────
  listicle_5step: tpl(
    "5-Step Listicle",
    "Five-page numbered countdown with progress dots",
    [
      "step_1_title", "step_1_content",
      "step_2_title", "step_2_content",
      "step_3_title", "step_3_content",
      "step_4_title", "step_4_content",
      "step_5_title", "step_5_content",
    ],
    {
      step_1_title: "Set Your Goal",
      step_1_content: "Define exactly what you want to achieve. Be specific.",
      step_2_title: "Create a Plan",
      step_2_content: "Break it into daily actions you can actually stick to.",
      step_3_title: "Track Progress",
      step_3_content: "What gets measured gets managed. Log everything.",
      step_4_title: "Adjust & Adapt",
      step_4_content: "Review weekly. Drop what doesn't work, double down on what does.",
      step_5_title: "Stay Consistent",
      step_5_content: "Motivation gets you started. Habit keeps you going.",
      video_title: "5 Steps to Transform Your Life 🔟",
      description:
        "A simple 5-step framework that actually works. Save this for later!",
      tags: "steps,howto,selfimprovement,productivity,guide",
      hashtags: "steps howto productivity",
    },
  ),

  course_promo: tpl(
    "Course Promo",
    "Four-page course advertisement: hook → problem → solution → CTA",
    ["hook", "sub_hook", "problem", "solution", "course_name", "offer", "benefits", "cta", "urgency"],
    {
      hook: "Want to 10x Your Income in 90 Days?",
      sub_hook: "Without a degree. Without connections. Without luck.",
      problem:
        "Most people work hard but stay broke because they follow outdated advice.",
      solution:
        "Our proven framework has helped 5,000+ students land high-paying clients.",
      course_name: "The Client Blueprint",
      offer: "Launch Price: $197 (Regular $497)",
      benefits:
        "• 20 video lessons\n• Templates & scripts\n• Private community\n• Weekly Q&A calls",
      cta: "Enroll Now",
      urgency: "Only 50 spots left at this price!",
      video_title: "10x Your Income in 90 Days 🎓",
      description:
        "The Client Blueprint is open for enrollment. Limited spots at launch price.",
      tags: "course,online,learning,business,income",
      hashtags: "course online learning business",
    },
  ),

  customer_journey: tpl(
    "Customer Journey",
    "Three-page story: struggle → discovery → result",
    ["struggle", "discovery", "result", "cta", "testimonial", "customer_name"],
    {
      struggle:
        "We were spending 4 hours daily on manual data entry. Errors everywhere. Zero time for strategy.",
      discovery:
        "Then we found AutoFlow — an AI-powered workflow tool that changed everything.",
      result:
        "Within 3 weeks: 90% less manual work, zero errors, and our team finally focusing on what matters.",
      cta: "Try AutoFlow Free",
      testimonial:
        "\"This tool saved our team 20 hours per week. I wish I'd found it sooner.\"",
      customer_name: "Mike R., Operations Lead",
      video_title: "How We Saved 20 Hours/Week 🚀",
      description:
        "Real customer story: from drowning in data entry to strategic growth.",
      tags: "customer,story,journey,transformation,review",
      hashtags: "customerstory journey transformation",
    },
  ),

  weekly_recap: tpl(
    "Weekly Recap",
    "Three-page news recap: title → moments → next week",
    ["week_title", "date_range", "highlight_stat", "highlight_label", "moments", "next_week", "cta"],
    {
      week_title: "AI Industry Explodes",
      date_range: "June 24 – June 30, 2024",
      highlight_stat: "3 Major Launches",
      highlight_label: "This Week in AI",
      moments:
        "• GPT-5 rumors confirmed\n• Apple Intelligence announced\n• open-source model beats GPT-4\n• AI regulation bill advances",
      next_week:
        "Expect: Google Gemini 2.0 leak, Microsoft Copilot updates, and more open-source releases.",
      cta: "Follow for Weekly Updates",
      video_title: "This Week in AI: 3 Major Launches 📰",
      description:
        "Your weekly recap of everything that happened in the AI world.",
      tags: "weekly,recap,news,ai,technology",
      hashtags: "weekly recap news ai",
    },
  ),
};

export const CSV_TEMPLATE_KEYS = Object.keys(CSV_TEMPLATES);

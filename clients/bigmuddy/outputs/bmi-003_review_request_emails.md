# Big Muddy Inn - Post-Stay Review Request Sequence

## Email 1: The Thank You (Send: Day of checkout or next morning)

**Subject:** Thank you for staying with us at the Big Muddy

---

Hi [GUEST NAME],

We hope you made it home safely—though we suspect the Mississippi might still be on your mind.

Tracy and I wanted to say thank you personally. Running the Big Muddy isn't just a business for us; it's a continuation of something that's been happening on Silver Street for over a hundred and fifty years. Having you as our guest means you're part of that story now.

We hope the river gave you a few quiet moments. We hope the Blues Room gave you something you didn't know you needed. And we hope Natchez surprised you the way it surprised us when we first fell in love with this place.

If there's anything we could have done better, we'd genuinely love to hear it. Just hit reply—this comes straight to us.

Safe travels until next time,

**Tracy & Amy Hobkirk**  
Big Muddy Inn & Blues Room  
11 Silver Street, Natchez

P.S. If you took any photos of the river or the Blues Room, we'd love to see them. Tag us @bigmuddyinn or just reply to this email.

---

## Email 2: The Gentle Ask (Send: 5 days after checkout)

**Subject:** A small favor (if you have two minutes)

---

Hi [GUEST NAME],

We hope the post-trip laundry is done and the memories are still fresh.

We have a small favor to ask—and we promise it's genuinely small.

If your stay at the Big Muddy left you with a good feeling, would you consider sharing that on Google or TripAdvisor? A few sentences about what you experienced makes a real difference for a small inn like ours. It helps other travelers find their way to Silver Street.

**Leave a Google review:** [GOOGLE REVIEW LINK]  
**Leave a TripAdvisor review:** [TRIPADVISOR LINK]

If something about your stay wasn't quite right, we'd rather hear about it directly—just reply to this email. We're always working to make the Big Muddy better, and honest feedback is the only way we learn.

Either way, thank you for trusting us with your Natchez visit. We hope to see you back on the river someday.

Warmly,

**Amy Hobkirk**  
Big Muddy Inn & Blues Room

---

## Implementation Notes

**Timing:**
- Email 1: Automated to send at 10am the day after checkout
- Email 2: Automated to send 5 days post-checkout (skip if review already received)

**Personalization:**
- Use first name only (not "Mr./Mrs.")
- Reference specific room if possible ("hope the River Suite treated you well")
- If they attended a Blues Room show, mention the performer's name

**Links to prepare:**
- Google review direct link (from GBP dashboard)
- TripAdvisor review link

**Suppression:**
- Don't send Email 2 if guest has already left a review
- Don't send to guests who complained during stay (flag in reservation notes)

**From address:** amy@thebigmuddyinn.com (personal, not no-reply)
